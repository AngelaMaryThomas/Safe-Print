FROM python:3.9-alpine
RUN apk add --no-cache samba-client
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]

