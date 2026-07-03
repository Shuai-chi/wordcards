# EC2 手動部署步驟清單

1. **啟動執行個體**:AWS Console → EC2 → Launch Instance
   - AMI:Amazon Linux 2023 或 Ubuntu 22.04
   - 類型:`t2.micro`(Free Tier 適用)
   - 建立/選擇金鑰對(`.pem` 檔,妥善保管,遺失無法重新下載)
   - 安全群組:開放 22(SSH,建議限制來源為你的 IP)、8000(你的 API 埠,或改用 80/443 搭配 Nginx)

2. **連線與環境設置**
   ```bash
   chmod 400 my-key.pem
   ssh -i my-key.pem ec2-user@<EC2_PUBLIC_IP>

   sudo yum update -y
   sudo yum install -y python3 python3-pip git
   ```

3. **部署程式碼**
   ```bash
   git clone <your-repo-url>
   cd your-repo/course/04-chatgpt-api/examples
   python3 -m venv .venv
   source .venv/bin/activate
   pip install fastapi uvicorn openai python-dotenv
   ```

4. **設定環境變數**
   ```bash
   echo "OPENAI_API_KEY=sk-xxxx" > .env
   ```

5. **啟動服務(練習用,正式環境建議改用 systemd)**
   ```bash
   nohup uvicorn api_server:app --host 0.0.0.0 --port 8000 > app.log 2>&1 &
   ```

6. **驗證**
   ```bash
   curl -X POST http://<EC2_PUBLIC_IP>:8000/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "你好"}'
   ```

7. **(建議)用 systemd 管理程序,重開機自動啟動**
   ```ini
   # /etc/systemd/system/chatapi.service
   [Unit]
   Description=ChatGPT API Demo
   After=network.target

   [Service]
   User=ec2-user
   WorkingDirectory=/home/ec2-user/your-repo/course/04-chatgpt-api/examples
   ExecStart=/home/ec2-user/your-repo/course/04-chatgpt-api/examples/.venv/bin/uvicorn api_server:app --host 0.0.0.0 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   sudo systemctl enable chatapi
   sudo systemctl start chatapi
   ```

8. **練習結束後記得刪除 EC2 執行個體**,避免持續計費。
