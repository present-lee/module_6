"""애플리케이션 설정"""
import os
from dotenv import load_dotenv

# .env 파일 로드 (있는 경우)
load_dotenv()

# JWT 설정
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
