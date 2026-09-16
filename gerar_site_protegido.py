"""Gera a versão protegida (senha + rosto) do jornal para publicar no GitHub Pages.

Este script só LÊ o jornal já pronto (resultado_expandido/jornal_omni.html,
gerado por gerar_html.py) e escreve dentro desta pasta (site_para_github/).
Nenhum arquivo fora daqui é alterado.

Uso:
    python gerar_site_protegido.py --password "sua senha aqui"

Se --password não for informado, o script pergunta de forma segura (sem
mostrar o que é digitado).
"""

import argparse
import base64
import getpass
import hashlib
import os
from pathlib import Path

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

DEFAULT_INPUT = Path(__file__).parent.parent / "resultado_expandido" / "jornal_omni.html"
OUTPUT_JS = Path(__file__).parent / "js" / "content.enc.js"


def evp_bytes_to_key(password: bytes, salt: bytes, key_len=32, iv_len=16):
    """Mesma derivação de chave que o OpenSSL/CryptoJS usa por padrão (MD5)."""
    derived = b""
    block = b""
    while len(derived) < key_len + iv_len:
        block = hashlib.md5(block + password + salt).digest()
        derived += block
    return derived[:key_len], derived[key_len:key_len + iv_len]


def cryptojs_encrypt(plaintext: str, password: str) -> str:
    """Criptografa um texto no mesmo formato que CryptoJS.AES.decrypt() lê no navegador."""
    salt = os.urandom(8)
    key, iv = evp_bytes_to_key(password.encode("utf-8"), salt)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    ciphertext = cipher.encrypt(pad(plaintext.encode("utf-8"), AES.block_size))
    return base64.b64encode(b"Salted__" + salt + ciphertext).decode("ascii")


def build(input_path: Path, password: str) -> None:
    html = input_path.read_text(encoding="utf-8")
    encrypted = cryptojs_encrypt(html, password)

    # A senha também é guardada aqui (em base64, só para não ficar em texto
    # puro num Ctrl+F simples) para que o desbloqueio por rosto consiga
    # decifrar o conteúdo sem o usuário digitar nada. Isso é uma limitação
    # de qualquer site estático sem servidor: quem abrir o código do site
    # no navegador (F12) consegue encontrar essa senha. A criptografia aqui
    # protege contra acesso casual (alguém que só olha o link ou o
    # repositório por cima) — não contra alguém que decida vasculhar o
    # JavaScript de propósito.
    face_secret_b64 = base64.b64encode(password.encode("utf-8")).decode("ascii")

    OUTPUT_JS.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JS.write_text(
        "// Gerado por gerar_site_protegido.py — não editar à mão.\n"
        f"const ENCRYPTED_CONTENT = {encrypted!r};\n"
        f"const FACE_UNLOCK_SECRET_B64 = {face_secret_b64!r};\n",
        encoding="utf-8",
    )
    print(f"Conteúdo protegido gerado em '{OUTPUT_JS}'.")
    print("Agora suba a pasta site_para_github inteira (exceto este arquivo .py) para o GitHub.")


def main():
    parser = argparse.ArgumentParser(description="Gera o jornal protegido por senha/rosto para o GitHub Pages.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Jornal HTML já gerado (padrão: resultado_expandido/jornal_omni.html).")
    parser.add_argument("--password", type=str, default=None, help="Senha de acesso. Se omitido, é perguntada com segurança.")
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Não encontrei '{args.input}'. Rode o atalho 'Jornal Omni' primeiro para gerar o jornal.")

    password = args.password or getpass.getpass("Digite a senha de acesso do site: ")
    if not password:
        raise SystemExit("A senha não pode ser vazia.")

    build(args.input, password)


if __name__ == "__main__":
    main()
