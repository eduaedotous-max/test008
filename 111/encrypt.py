#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
加密 keys.json 文件
使用 AES-256-GCM 加密
运行: python encrypt.py 密码
"""

import os
import sys
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    return kdf.derive(password.encode())

def main():
    if len(sys.argv) < 2:
        print("用法: python encrypt.py 密码")
        return

    password = sys.argv[1]

    if not os.path.exists('keys.json'):
        print("Error: keys.json not found!")
        return

    with open('keys.json', 'r', encoding='utf-8') as f:
        data = f.read()

    salt = os.urandom(16)
    key = derive_key(password, salt)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, data.encode('utf-8'), None)

    with open('keys.enc', 'wb') as f:
        f.write(salt + nonce + ciphertext)

    print("加密成功! 已生成 keys.enc")
    os.remove('keys.json')
    print("原 keys.json 已删除")

if __name__ == '__main__':
    main()
