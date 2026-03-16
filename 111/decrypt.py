#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解密 keys.enc 文件
运行: python decrypt.py 密码
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
        print("用法: python decrypt.py 密码")
        return

    password = sys.argv[1]

    if not os.path.exists('keys.enc'):
        print("Error: keys.enc not found!")
        return

    try:
        with open('keys.enc', 'rb') as f:
            encrypted_data = f.read()

        salt = encrypted_data[:16]
        nonce = encrypted_data[16:28]
        ciphertext = encrypted_data[28:]

        key = derive_key(password, salt)
        aesgcm = AESGCM(key)
        decrypted_data = aesgcm.decrypt(nonce, ciphertext, None)

        with open('keys.json', 'w', encoding='utf-8') as f:
            f.write(decrypted_data.decode('utf-8'))

        print("解密成功! 已还原 keys.json")

    except Exception as e:
        print(f"Error: 解密失败! 密码错误或文件已损坏")

if __name__ == '__main__':
    main()
