#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
解密 keys.enc 文件
使用 AES-256-GCM 解密
"""

import os
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
    # 检查文件是否存在
    if not os.path.exists('keys.enc'):
        print("Error: keys.enc not found!")
        return

    # 输入密码
    password = getpass.getpass("请输入解密密码: ")

    try:
        # 读取 keys.enc
        with open('keys.enc', 'rb') as f:
            encrypted_data = f.read()

        # 提取 salt, nonce, ciphertext
        salt = encrypted_data[:16]
        nonce = encrypted_data[16:28]
        ciphertext = encrypted_data[28:]

        # 派生密钥
        key = derive_key(password, salt)

        # AES-GCM 解密
        aesgcm = AESGCM(key)
        decrypted_data = aesgcm.decrypt(nonce, ciphertext, None)

        # 写入 keys.json
        with open('keys.json', 'w', encoding='utf-8') as f:
            f.write(decrypted_data.decode('utf-8'))

        print("\n解密成功! 已还原 keys.json")

    except Exception as e:
        print(f"Error: 解密失败! 密码错误或文件已损坏: {e}")

if __name__ == '__main__':
    main()
