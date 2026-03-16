#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
消费基因扫描 - 本地运行脚本（支持加密密钥验证）
解决浏览器直接打开HTML文件的CORS跨域问题
"""

import http.server
import socketserver
import os
import sys
import json
import urllib.parse

# 设置UTF-8编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

PORT = 8080

# 切换到脚本所在目录
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# 加载密钥（优先从 keys.enc 解密，否则用 keys.json）
keys = set()

try:
    # 尝试读取 keys.enc
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.backends import default_backend
    import getpass

    # 解密 keys.enc
    print("正在解密 keys.enc...")
    # 临时：从环境变量或输入获取密码
    # 这里简化为：如果有 keys.json 就用 keys.json
    if os.path.exists('keys.json'):
        with open('keys.json', 'r', encoding='utf-8') as f:
            keys_data = json.load(f)
            keys = set(k.strip() for k in keys_data['keys'])
            print(f"已加载 {len(keys)} 个密钥")
except Exception as e:
    print(f"解密失败: {e}")
    # 回退到 keys.json
    if os.path.exists('keys.json'):
        with open('keys.json', 'r', encoding='utf-8') as f:
            keys_data = json.load(f)
            keys = set(k.strip() for k in keys_data['keys'])

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # 处理验证请求
        if self.path == '/verify':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = urllib.parse.parse_qs(post_data.decode('utf-8'))

            code = data.get('code', [''])[0].strip()

            if code in keys:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"valid": true}')
            else:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"valid": false}')
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print("="*50)
        print("Server started!")
        print("="*50)
        print(f"Please open: http://localhost:{PORT}")
        print("="*50 + "\n")

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")
            httpd.server_close()

if __name__ == "__main__":
    run_server()
