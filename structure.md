server-x/
├── api/                          # Vercel backend functions
│   ├── create-server.js          # Create server in DB
│   ├── renew-server.js           # Renew server (20-60 days)
│   └── upload-file.js           # Upload to Supabase storage
├── pages/                        # JSX files for interface
│   ├── login.jsx                # Windows-style login interface
│   └── signup.jsx               # Signup page (for later)
├── public/
│   └── index.html               # ONLY HTML file
└── package.json
