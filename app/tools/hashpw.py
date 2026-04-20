"""CLI: hash a password for APP_PASSWORD_HASH.

Run:
  uv run python -m app.tools.hashpw
Then paste the output into your .env / Vercel env var.
"""
import sys
import getpass

from argon2 import PasswordHasher


def main() -> None:
    if len(sys.argv) > 1:
        pw = sys.argv[1]
    else:
        pw = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm:  ")
        if pw != confirm:
            print("Passwords do not match.", file=sys.stderr)
            sys.exit(1)
    ph = PasswordHasher()
    print(ph.hash(pw))


if __name__ == "__main__":
    main()
