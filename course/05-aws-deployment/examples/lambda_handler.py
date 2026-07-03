"""Module 5 範例:把 Module 4 的 FastAPI app 包裝成 Lambda handler
需要 `pip install mangum` 並把 Module 4 的 api_server.py 放在同一個部署包裡。
"""

from mangum import Mangum

from api_server import app  # 來自 Module 4

handler = Mangum(app)
