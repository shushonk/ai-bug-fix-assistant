import { PresetBug } from "./types";

export const PRESET_BUGS: PresetBug[] = [
  {
    id: "react-infinite-render",
    title: "1. React Infinite Re-render",
    language: "typescript",
    description: "Triggers state changes directly inside the render block, crashing the React framework's render loop.",
    code: `import React, { useState } from 'react';

export default function UserProfile({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // BUG: Direct fetch and state update within render cycle
  fetch(\`/api/users/\${userId}\`)
    .then(res => res.json())
    .then(data => {
      setProfile(data);
      setLoading(false);
    });

  if (loading) return <div>Loading User Profile...</div>;
  
  return (
    <div className="p-4 border rounded">
      <h1>{profile?.name}</h1>
      <p>{profile?.email}</p>
    </div>
  );
}`,
    errorLogs: `Uncaught Error: Too many re-renders. React limits the number of renders to prevent an infinite loop.
    at Object.useState (react-dom.development.js:16223:21)
    at UserProfile (UserProfile.tsx:6:21)
    at renderWithHooks (react-dom.development.js:14985:18)`,
    category: "Frontend",
    customContext: "React 18 with Vite. Executed on primary route.",
    expectedBehavior: "The user's profile metadata is fetched or cached once when the component is initially mounted.",
    actualBehavior: "The page freezes, and the developer console throws an infinite rendering recursion error in useState.",
    stepsToReproduce: "1. Load page containing <UserProfile userId=\"usr_99\" />\n2. Open Chrome Developer Console\n3. Note call stack limit exceeded crash."
  },
  {
    id: "react-useeffect-loop",
    title: "2. React useEffect Dependency Loop",
    language: "typescript",
    description: "Effect dependent on an object literal recreated on each cycle, entering a rendering loop.",
    code: `import React, { useState, useEffect } from 'react';

export default function FilterDashboard() {
  const [filters, setFilters] = useState({ status: 'active', tags: [] });
  const [data, setData] = useState([]);

  useEffect(() => {
    const query = new URLSearchParams(filters as any).toString();
    fetch(\`/api/list?\${query}\`)
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        // BUG: Mutating filter criteria on render completes, creating new reference
        setFilters({ status: 'active', tags: [] });
      });
  }, [filters]); // BUG: non-primitive reference type dependencies

  return (
    <div className="p-4">
      <p>Dashboard Results: {data.length}</p>
    </div>
  );
}`,
    errorLogs: `Warning: Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render.`,
    category: "Frontend",
    customContext: "React 18, utilizing default state objects.",
    expectedBehavior: "Fetch fresh dashboard lists from database only when filters are changed by user interaction.",
    actualBehavior: "Spits thousands of network calls to /api/list per second, crashing developer console with update depth exceeded warns.",
    stepsToReproduce: "1. Mount component\n2. View Network Tab to see endless requests.\n3. Verify Warning trace."
  },
  {
    id: "button-onclick-bug",
    title: "3. Button onClick Not Working",
    language: "typescript",
    description: "Direct invocation of function inside JSX binder rather than registering a callback reference.",
    code: `import React, { useState } from 'react';

export default function DeletionModal() {
  const [isDeleting, setIsDeleting] = useState(false);

  const performDeleteAction = (id: string) => {
    setIsDeleting(true);
    console.log("Resource deleted successfully: " + id);
  };

  return (
    <div className="p-6 bg-slate-900 border rounded text-white">
      <h3>Are you sure you want to delete this resource?</h3>
      <div className="mt-4 flex gap-2">
        {/* BUG: Calling function right away during JSX parse instead of passing callback reference */}
        <button 
          onClick={performDeleteAction("resource-404")}
          className="px-4 py-2 bg-rose-600 rounded text-xs"
        >
          Confirm Delete
        </button>
      </div>
    </div>
  );
}`,
    errorLogs: `console.log prints automatically on component mount without clicking.
Uncaught Error: Too many re-renders. React limits the number of renders.`,
    category: "Logical",
    customContext: "React 18, standard modal button event.",
    expectedBehavior: "The deletion action is only executed when the user physically clicks the Confirm Delete button.",
    actualBehavior: "The action fires automatically when the modal loads, crashing with React recursive re-render limit.",
    stepsToReproduce: "1. Open the modal.\n2. Note 'Resource deleted' log in console instantly before clicking.\n3. Note infinite render crash."
  },
  {
    id: "api-500-error",
    title: "4. API 500 Error",
    language: "javascript",
    description: "Express router tries to access deep nested model values without safety checks on missing structures.",
    code: `const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/users/profile', (req, res) => {
  // BUG: Destructuring nested attributes without confirming 'organization' object exists
  const { username, organization: { details: { title } } } = req.body;
  
  res.json({
    status: 'success',
    username,
    orgTitle: title
  });
});

app.listen(8080);`,
    errorLogs: `TypeError: Cannot read properties of undefined (reading 'details')
    at /server/app.js:10:48
    at Layer.handle [as handle_request] (/server/node_modules/express/lib/router/layer.js:95:5)
    at next (/server/node_modules/express/lib/router/route.js:144:13)`,
    category: "Backend",
    customContext: "Express v4 REST App. Client requests are optional with the 'organization' property.",
    expectedBehavior: "Processes profile saves safely regardless of whether organization properties are supplied in body.",
    actualBehavior: "The Express API process completely crashes or returns 500 Internal error when post is empty/partial.",
    stepsToReproduce: "1. Spin up Express app\n2. Send a POST request with body: {\"username\": \"dev_coder\"}\n3. Observe node server crash with uncaught TypeError."
  },
  {
    id: "cors-error",
    title: "5. CORS Error",
    language: "javascript",
    description: "API server served on independent origin without returning cross-origin response headers.",
    code: `const express = require('express');
const app = express();

app.get('/api/analytics', (req, res) => {
  // BUG: Missing Access-Control-Allow-Origin response headers
  res.json({
    visitors: 12053,
    bounces: "12%"
  });
});

app.listen(9000);`,
    errorLogs: `Access to fetch at 'http://localhost:9050/api/analytics' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
    category: "API & Integration",
    customContext: "Frontend serves on port 3000, Analytics backend on port 9000.",
    expectedBehavior: "Client browser is permitted to pull metrics json securely across cross-ports.",
    actualBehavior: "Browser halts call, throws pink block warning, network request fails.",
    stepsToReproduce: "1. Fetch http://localhost:9000/api/analytics from developer dashboard serving on localhost:3000\n2. Note CORS reject console."
  },
  {
    id: "jwt-auth-failed",
    title: "6. JWT Authentication Failed",
    language: "javascript",
    description: "Server configuration fails to set secret variables, allowing verification to operate on nulls.",
    code: `const jwt = require('jsonwebtoken');

function authorizeToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  // BUG: process.env.ACCESS_TOKEN_SECRET may be undefined (no fallback configured)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Access token is invalid or expired" });
    req.user = user;
    next();
  });
}`,
    errorLogs: `JsonWebTokenError: secret or public key must be provided
    at Object.module.exports [as verify] (/app/node_modules/jsonwebtoken/verify.js:63:17)
    at authorizeToken (/app/middleware/auth.js:12:7)`,
    category: "Security",
    customContext: "Express JWT Middleware loaded via process.env.",
    expectedBehavior: "Decodes valid token inputs securely against the server signature key.",
    actualBehavior: "All authentication attempts trigger 500 server errors because verification secret is undefined.",
    stepsToReproduce: "1. Send GET request with authorization token header\n2. Note exception 'secret or public key must be provided'."
  },
  {
    id: "mongodb-connection-error",
    title: "7. MongoDB Connection Error",
    language: "javascript",
    description: "Creating client pool and db socket handshakes instantly within active request route handlers.",
    code: `const { MongoClient } = require('mongodb');

// BUG: Connection Client created inside API call loop
async function handleGetUserData(req, res) {
  const client = new MongoClient("mongodb://localhost:27017/prod");
  
  try {
    await client.connect();
    const db = client.db("prod");
    const user = await db.collection("users").findOne({ id: req.params.id });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
}`,
    errorLogs: `MongoNetworkError: connection timed out at connectionPool.js:244
    at MongoClient.connect (/app/node_modules/mongodb/lib/mongo_client.js:210:17)
WARN: Max connection limit of 100 reached. Internal server error.`,
    category: "Database",
    customContext: "Production environment under moderate read traffic loads.",
    expectedBehavior: "Instantiates a connection client once at app startup and reuses pool sockets.",
    actualBehavior: "API routes crash with timeout exceptions after 100 successive visits as sockets are exhausted.",
    stepsToReproduce: "1. Run performance benchmark (siege or autocannon) calling handleGetUserData\n2. MongoDB quickly limits new TCP ports."
  },
  {
    id: "typescript-compile-error",
    title: "8. TypeScript Compile Error",
    language: "typescript",
    description: "Strict compiler properties violation by assigning null to parameters that are strongly typed.",
    code: `interface AppSettings {
  theme: 'light' | 'dark';
  enableCaching: boolean;
  maxRetries?: number;
}

export function configureWorkspace(settings: AppSettings) {
  // BUG: strictNullChecks does not allow setting theme to null
  if (settings.theme === undefined) {
    settings.theme = null; // TS compilation fails here
  }
  
  const cacheStatus = settings.enableCaching ? "Active" : "Disabled";
  console.log("Configured cache settings: " + cacheStatus);
}`,
    errorLogs: `src/workspace.ts:9:5 - Error: Type 'null' is not assignable to type '"light" | "dark"'.
src/workspace.ts:12:31 - Error: Property 'enableCaching' has implicit 'any' compile flag.`,
    category: "Syntax",
    customContext: "tsconfig compiled with strictNullChecks: true and noImplicitAny: true.",
    expectedBehavior: "Fallback parameters default to 'light' cleanly within safe TypeScript constraints.",
    actualBehavior: "The project build fails at compile step; no bundling happens.",
    stepsToReproduce: "1. Run 'npm run build'\n2. Review TSC compiler output logs."
  },
  {
    id: "vite-import-error",
    title: "9. Vite Import Error",
    language: "typescript",
    description: "Import paths with customized folder wildcards (@/components) fail when no build paths alias is specified.",
    code: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // BUG: Missing path resolve options configuration under alias structure
  build: {
    outDir: 'dist'
  }
});`,
    errorLogs: `[vite:css] [postcss] Failed to find '@/styles/theme.css' relative to /src/App.tsx
[vite] Internal server error: Failed to resolve import "@/components/Button" from "src/App.tsx". Does the file exist?`,
    category: "DevOps/Config",
    customContext: "Vite + TS App utilizing custom nested imports.",
    expectedBehavior: "Source imports like '@/components/Button' resolve perfectly and bundle.",
    actualBehavior: "Server breaks down on load or build, printing import path resolution failures.",
    stepsToReproduce: "1. Reference components using '@/components/Button'\n2. Start Vite server\n3. Observe local error screen."
  },
  {
    id: "sql-injection-risk",
    title: "10. SQL Injection Risk",
    language: "python",
    description: "Splicing untrusted string input format variables straight into relational DB executions.",
    code: `import sqlite3

def get_user_records(user_id_input: str):
    conn = sqlite3.connect('production_users.db')
    cursor = conn.cursor()
    
    # BUG: Running unescaped literal format f-strings as queries
    query = f"SELECT id, username, email FROM users WHERE id = '{user_id_input}'"
    print(f"[VERBOSE LOG] Executing Query: {query}")
    
    cursor.execute(query)
    records = cursor.fetchall()
    conn.close()
    return records`,
    errorLogs: `[VERBOSE LOG] Executing Query: SELECT id, username, email FROM users WHERE id = '1' OR '1'='1'
Database returns all 15000 users instead of matching the specific user.`,
    category: "Security",
    customContext: "Python database handler backend.",
    expectedBehavior: "Utilize strict mapped parameterized queries so input arguments are fully parameterized.",
    actualBehavior: "Malicious payloads inject SQL syntax queries, resulting in exfiltration of bulk user records.",
    stepsToReproduce: "1. Invoke get_user_records(\"1' OR '1'='1\")\n2. Note returned system data results."
  }
];
