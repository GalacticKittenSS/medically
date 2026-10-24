import os
import sys
import mariadb
from dotenv import load_dotenv

load_dotenv()

try:
		config = {
				"user": os.getenv('DB_USER'),
				"password": os.getenv("DB_PASSWORD"),
				"host": os.getenv("DB_HOST"),
				"port": os.getenv("DB_PORT")
		}

		with mariadb.connect(user=config['user'], password=config['password'], host=config['host'], port=int(config['port'])) as conn:
				print("Connected to mariadb successfully")

				with conn.cursor() as cursor:
						database_name = os.getenv("DB_NAME")
						cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{database_name}`")
						print(f"Database '{database_name}' created successfully")
						
						cursor.execute(f"USE {database_name}")
						cursor.execute("CREATE TABLE IF NOT EXISTS users (user_id INT(11) NOT NULL AUTO_INCREMENT, email_address VARCHAR(255) NOT NULL, password BINARY(60) NOT NULL, PRIMARY KEY (user_id));")
						cursor.execute("CREATE TABLE IF NOT EXISTS sessions (session_id INT(11) NOT NULL AUTO_INCREMENT, user_id INT(11) NOT NULL, token_hash BINARY(64) NOT NULL, created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP NOT NULL, PRIMARY KEY (session_id), UNIQUE KEY (token_hash), KEY (user_id));")
						print(f"Tables successfully created")
except mariadb.Error as e:
		sys.exit(f"Error connecting to mariadb: {e}")

