"""
Аутентификация: регистрация, вход, выход, проверка сессии, список пользователей.
Принимает action в теле запроса: register | login | logout | me | users
"""
import json
import os
import hashlib
import secrets
import psycopg2

S = os.environ.get("MAIN_DB_SCHEMA", "public")


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


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

    action = body.get("action") or (event.get("queryStringParameters") or {}).get("action", "me")
    session_id = event.get("headers", {}).get("X-Session-Id", "")

    conn = get_conn()
    try:
        if action == "register":
            username = body.get("username", "").strip().lower()
            password = body.get("password", "")
            display_name = body.get("display_name", "").strip()

            if not username or not password or not display_name:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Заполните все поля"})}
            if len(username) < 3:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Логин минимум 3 символа"})}
            if len(password) < 4:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Пароль минимум 4 символа"})}

            with conn.cursor() as cur:
                cur.execute(f"SELECT id FROM {S}.users WHERE username = %s", (username,))
                if cur.fetchone():
                    return {"statusCode": 409, "headers": headers, "body": json.dumps({"error": "Логин уже занят"})}
                cur.execute(
                    f"INSERT INTO {S}.users (username, password_hash, display_name) VALUES (%s, %s, %s) RETURNING id",
                    (username, hash_password(password), display_name)
                )
                user_id = cur.fetchone()[0]
                sid = secrets.token_hex(32)
                cur.execute(f"INSERT INTO {S}.sessions (id, user_id) VALUES (%s, %s)", (sid, user_id))
                conn.commit()

            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "session_id": sid,
                "user": {"id": user_id, "username": username, "display_name": display_name}
            })}

        if action == "login":
            username = body.get("username", "").strip().lower()
            password = body.get("password", "")
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT id, username, display_name FROM {S}.users WHERE username = %s AND password_hash = %s",
                    (username, hash_password(password))
                )
                user = cur.fetchone()
            if not user:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Неверный логин или пароль"})}
            sid = secrets.token_hex(32)
            with conn.cursor() as cur:
                cur.execute(f"INSERT INTO {S}.sessions (id, user_id) VALUES (%s, %s)", (sid, user[0]))
                conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "session_id": sid,
                "user": {"id": user[0], "username": user[1], "display_name": user[2]}
            })}

        if action == "logout":
            if session_id:
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE {S}.sessions SET expires_at = NOW() WHERE id = %s", (session_id,))
                    conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        if action == "me":
            with conn.cursor() as cur:
                user = get_user_by_session(cur, session_id)
            if not user:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "user": {"id": user[0], "username": user[1], "display_name": user[2]}
            })}

        if action == "users":
            with conn.cursor() as cur:
                user = get_user_by_session(cur, session_id)
                if not user:
                    return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}
                cur.execute(f"SELECT id, username, display_name FROM {S}.users ORDER BY display_name")
                users = [{"id": r[0], "username": r[1], "display_name": r[2]} for r in cur.fetchall()]
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"users": users})}

        return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Неизвестный action"})}

    finally:
        conn.close()
