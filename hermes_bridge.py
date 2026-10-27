"""Hermes-Quetzalcoatl bridge: polls for mentions and responds.

Usage:
    python hermes_bridge.py --username yourname --password yourpass
    # or --email yourname (if email is used as username)

This runs as a persistent service that:
1. Logs in with user credentials
2. Gets a bot token for the Narusya bot user
3. Polls /api/bot/pending for mentions every N seconds
4. When a mention is found, fetches channel history for context
5. Generates a response (currently echoes; replace with Hermes LLM call)
6. Posts the response via /api/bot/message
"""

import argparse
import time
import json
import urllib.request
import urllib.error
import urllib.parse
import os


def api_request(base_url, method, path, data=None, token=None):
    """Make an API request."""
    url = f"{base_url}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} on {method} {path}: {e.read().decode()[:200]}")
        return None
    except Exception as e:
        print(f"Error on {method} {path}: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Hermes-Quetzalcoatl bridge")
    parser.add_argument("--url", default="http://localhost:8000", help="Quetzalcoatl base URL")
    parser.add_argument("--username", "-u", help="Username (or email if used as username)")
    parser.add_argument("--email", "-e", help="Email address (alias for --username; login endpoint uses username)")
    parser.add_argument("--password", required=True, help="User password")
    parser.add_argument("--interval", type=int, default=5, help="Poll interval in seconds")
    args = parser.parse_args()

    # Accept --username or --email (login endpoint uses username field)
    login_username = args.username or args.email
    if not login_username:
        parser.error("Either --username or --email is required")

    # Login
    print(f"Logging in to {args.url} as {login_username}...")
    login_data = {"username": login_username, "password": args.password}
    # OAuth2 form login
    import urllib.parse
    form_data = urllib.parse.urlencode(login_data).encode()
    req = urllib.request.Request(
        f"{args.url}/api/auth/login",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            login_resp = json.loads(resp.read().decode())
    except Exception as e:
        print(f"Login failed: {e}")
        return

    user_token = login_resp["access_token"]
    print("Logged in successfully.")

    # Get bot token
    bot_token_resp = api_request(args.url, "POST", "/api/bot/token", token=user_token)
    if not bot_token_resp:
        print("Failed to get bot token")
        return

    bot_token = bot_token_resp["access_token"]
    bot_user_id = bot_token_resp["bot_user_id"]
    print(f"Bot token acquired. Bot user ID: {bot_user_id}")

    # Main poll loop
    print(f"Polling for mentions every {args.interval} seconds...")
    try:
        while True:
            pending = api_request(args.url, "GET", "/api/bot/pending", token=bot_token)
            if pending:
                for mention in pending:
                    print(f"\n--- Mention from {mention['author_username']} in {mention['server_name']}/#{mention['channel_name']} ---")
                    print(f"Content: {mention['content'][:200]}")

                    # Get channel history for context
                    history = api_request(args.url, "GET", f"/api/bot/history/{mention['channel_id']}", token=bot_token)
                    if history:
                        print(f"Channel history ({len(history)} messages) loaded for context.")

                    # ============================================================
                    # PLACEHOLDER RESPONSE — needs LLM call wired in
                    # Replace this with actual Hermes LLM call for real responses
                    # ============================================================
                    response_text = f"Hey {mention['author_username']}! I saw your message. I'm Narusya, your friendly neighborhood AI. 🐍💛"

                    # Post response
                    result = api_request(args.url, "POST", "/api/bot/message", data={
                        "channel_id": mention["channel_id"],
                        "content": response_text,
                        "reply_to_id": mention["message_id"],
                    }, token=bot_token)

                    if result:
                        print(f"Response posted: {result['id']}")
                    else:
                        print("Failed to post response.")

            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nShutting down bridge.")


if __name__ == "__main__":
    main()
