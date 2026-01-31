from flask import Flask, request, render_template, jsonify, send_from_directory
import os, socket, subprocess

app = Flask(__name__)
UPLOAD_FOLDER = '/session_data'
if not os.path.exists(UPLOAD_FOLDER): os.makedirs(UPLOAD_FOLDER)

# Helper to find IP
def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
        s.close()
    except: IP = '127.0.0.1'
    return IP

@app.route('/')
def index():
    # Detect Mobile vs Desktop
    ua = request.headers.get('User-Agent', '').lower()
    if 'mobile' in ua or 'android' in ua:
        return render_template('upload.html')
    return render_template('dashboard.html', upload_url=f"http://{get_ip()}:5000")

@app.route('/upload', methods=['POST'])
def upload():
    f = request.files.get('file')
    if f:
        f.save(os.path.join(UPLOAD_FOLDER, f.filename))
        return "<h1>File Uploaded! Check the Screen.</h1>"
    return "Error", 400

@app.route('/files')
def files():
    return jsonify(os.listdir(UPLOAD_FOLDER))

@app.route('/preview/<path:filename>')
def preview(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/print')
def print_file():
    filename = request.args.get('file')
    # Connects to Windows Printer named 'ShopPrinter'
    cmd = f"smbclient //host.docker.internal/ShopPrinter -U 'Guest%' -c 'print {os.path.join(UPLOAD_FOLDER, filename)}'"
    subprocess.run(cmd, shell=True)
    return jsonify({"status": "sent"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
