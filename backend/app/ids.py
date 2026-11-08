import secrets
import string

_ALPHABET = string.ascii_letters + string.digits + "_-"


def nid(n: int = 16) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(n))
