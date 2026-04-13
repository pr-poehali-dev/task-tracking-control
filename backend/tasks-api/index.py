"""
API для задач: получение, создание, обновление (toggle/edit), удаление.
Личные задачи видит только владелец, общие — все авторизованные пользователи.
Принимает action: list | create | update | delete
"""
import json
import os
import psycopg2

S = os.environ.get("MAIN_DB_SCHEMA", "public")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_user_by_session(cur, session_id: str):
    cur.execute(
        f"SELECT u.id, u.username, u.display_name FROM {S}.sessions s "
        f"JOIN {S}.users u ON u.id = s.user_id "
        "WHERE s.id = %s AND s.expires_at > NOW()",
        (session_id,)
    )
    return cur.fetchone()


def handler(event: dict, context) -> dict:
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Id"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    action = body.get("action", "list")
    session_id = event.get("headers", {}).get("X-Session-Id", "")
    if event.get("httpMethod") == "GET":
        action = "list"

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            user = get_user_by_session(cur, session_id)

        if not user:
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}

        user_id, username, display_name = user

        if action == "list":
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT t.id, t.title, t.description, t.priority, t.category, t.status, "
                    f"t.due_date, t.is_shared, t.owner_id, t.created_at, u.display_name "
                    f"FROM {S}.tasks t JOIN {S}.users u ON u.id = t.owner_id "
                    "WHERE (t.owner_id = %s OR t.is_shared = TRUE) AND t.status != 'deleted' "
                    "ORDER BY t.created_at DESC",
                    (user_id,)
                )
                rows = cur.fetchall()
            tasks = [{
                "id": r[0], "title": r[1], "description": r[2],
                "priority": r[3], "category": r[4], "status": r[5],
                "due_date": r[6].isoformat() if r[6] else None,
                "is_shared": r[7], "owner_id": r[8],
                "created_at": r[9].isoformat() if r[9] else None,
                "owner_name": r[10]
            } for r in rows]
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"tasks": tasks})}

        if action == "create":
            title = body.get("title", "").strip()
            if not title:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Название обязательно"})}
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {S}.tasks (title, description, priority, category, status, due_date, is_shared, owner_id) "
                    "VALUES (%s, %s, %s, %s, 'active', %s, %s, %s) RETURNING id, created_at",
                    (
                        title,
                        body.get("description") or None,
                        body.get("priority", "medium"),
                        body.get("category", "work"),
                        body.get("due_date") or None,
                        body.get("is_shared", False),
                        user_id
                    )
                )
                task_id, created_at = cur.fetchone()
                conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "task": {
                    "id": task_id, "title": title,
                    "description": body.get("description"),
                    "priority": body.get("priority", "medium"),
                    "category": body.get("category", "work"),
                    "status": "active",
                    "due_date": body.get("due_date"),
                    "is_shared": body.get("is_shared", False),
                    "owner_id": user_id,
                    "owner_name": display_name,
                    "created_at": created_at.isoformat()
                }
            })}

        if action == "update":
            task_id = body.get("id")
            if not task_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "id обязателен"})}
            with conn.cursor() as cur:
                cur.execute(f"SELECT owner_id, is_shared FROM {S}.tasks WHERE id = %s", (task_id,))
                task = cur.fetchone()
            if not task:
                return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Задача не найдена"})}
            owner_id_t, is_shared = task
            if owner_id_t != user_id and not is_shared:
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет доступа"})}

            allowed = ["title", "description", "priority", "category", "status", "due_date", "is_shared"]
            fields, values = [], []
            for f in allowed:
                if f in body:
                    fields.append(f"{f} = %s")
                    values.append(body[f] if body[f] != "" else None)
            if fields:
                values.append(task_id)
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE {S}.tasks SET {', '.join(fields)}, updated_at = NOW() WHERE id = %s", values)
                    conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        if action == "delete":
            task_id = body.get("id")
            with conn.cursor() as cur:
                cur.execute(f"SELECT owner_id FROM {S}.tasks WHERE id = %s", (task_id,))
                task = cur.fetchone()
            if not task:
                return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Задача не найдена"})}
            if task[0] != user_id:
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Только владелец может удалить задачу"})}
            with conn.cursor() as cur:
                cur.execute(f"UPDATE {S}.tasks SET status = 'deleted' WHERE id = %s", (task_id,))
                conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Неизвестный action"})}

    finally:
        conn.close()
