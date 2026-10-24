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
except mariadb.Error as e:
    sys.exit(f"Error connecting to mariadb: {e}")

