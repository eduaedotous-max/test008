#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
加密 keys.json 文件
使用 AES-256-GCM 加密
"""

import os
import json
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend
import getpass

def derive_key(password: str, salt: bytes) -> bytes:
    """从密码派生 AES 密钥"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256-bit key
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    return kdf.derive(password.encode())

def main():
    # 读取 keys.json
    if not os.path.exists('keys.json'):
        print("Error: keys.json not found!")
        return

    with open('keys.json', 'r', encoding='utf-8') as f:
        data = f.read()

    # 输入密码
    password = getpass.getpass("请输入加密密码: ")
    confirm = getpass.getpass("请再次输入密码: ")

    if password != confirm:
        print("Error: 两次密码不一致!")
        return

    if len(password) < 6:
        print("Error: 密码至少需要6位!")
        return

    # 生成随机盐
    salt = os.urandom(16)

    # 派生密钥
    key = derive_key(password, salt)

    # AES-GCM 加密
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, data.encode('utf-8'), None)

    # 写入 keys.enc (格式: salt(16) + nonce(12) + ciphertext)
    with open('keys.enc', 'wb') as f:
        f.write(salt + nonce + ciphertext)

    print("\n加密成功! 已生成 keys.enc")

    # 删除原文件
    os.remove('keys.json')
    print("原 keys.json 已删除")

if __name__ == '__main__':
    main()
