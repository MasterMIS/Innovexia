import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: 'Authorization failed', details: error },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code received' },
      { status: 400 }
    );
  }

  // Return HTML page with the code displayed
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>OAuth Authorization</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .success {
            color: #28a745;
            font-size: 24px;
            margin-bottom: 20px;
          }
          .code-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #dee2e6;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
          }
          .instructions {
            margin-top: 20px;
            padding: 15px;
            background: #d1ecf1;
            border-radius: 4px;
            border: 1px solid #bee5eb;
          }
          .button {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 15px;
          }
          .button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓ Authorization Successful!</div>
          <p>Copy the authorization code below and paste it into your terminal:</p>
          <div class="code-box" id="code">${code}</div>
          <button class="button" onclick="copyCode()">Copy Code</button>
          <div class="instructions">
            <strong>Next Steps:</strong>
            <ol>
              <li>Copy the authorization code above</li>
              <li>Return to your terminal</li>
              <li>Paste the code when prompted</li>
            </ol>
          </div>
        </div>
        <script>
          function copyCode() {
            const code = document.getElementById('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
              alert('Code copied to clipboard!');
            });
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
