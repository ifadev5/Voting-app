# 🎓 UniVote — University Awards Voting System

A full-stack voting web application for university awards. Students vote by paying via OPay (₦200 = 1 vote), submitting their transaction reference, and an admin approves votes manually.

---

## 📁 Project Structure

```
voting-app/
├── backend/              # Node.js + Express API
│   ├── models/
│   │   ├── Category.js
│   │   ├── Candidate.js
│   │   └── Submission.js
│   ├── uploads/          # Candidate images (auto-created)
│   ├── server.js
│   ├── seed.js           # Optional: seed sample data
│   ├── .env.example
│   └── package.json
└── frontend/             # React app
    ├── src/
    │   ├── pages/
    │   │   ├── Home.js       # Candidate listing + vote modal
    │   │   ├── Results.js    # Live vote standings
    │   │   └── Admin.js      # Admin dashboard
    │   ├── components/
    │   │   ├── Navbar.js
    │   │   ├── CandidateCard.js
    │   │   └── VoteModal.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

---

## ⚙️ Prerequisites

- **Node.js** v16+ — https://nodejs.org
- **MongoDB** (local or Atlas) — https://www.mongodb.com
- **npm** or **yarn**

---

## 🚀 Setup & Run

### 1. Clone / download the project

```bash
cd voting-app
```

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=mongodb://localhost:27017/university-voting
PORT=5000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

> **Using MongoDB Atlas?** Replace `MONGO_URI` with your Atlas connection string.

**Start the backend:**
```bash
npm run dev       # development (with nodemon auto-reload)
# or
npm start         # production
```

Backend runs at: **http://localhost:5000**

---

### 3. (Optional) Seed Sample Data

```bash
cd backend
node seed.js
```

This adds 4 categories and 8 sample candidates to get you started.

---

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

If your backend is NOT on port 5000 or is deployed, create a `.env` file:
```
REACT_APP_API_URL=http://localhost:5000
```

> Leave `REACT_APP_API_URL` empty or omit the `.env` if using the default proxy (`localhost:5000`).

**Start the frontend:**
```bash
npm start
```

Frontend runs at: **http://localhost:3000**

---

## 🔐 Admin Login

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

> Change these in your `.env` file before going live.

---

## 🌐 Pages

| Page        | URL              | Description                          |
|-------------|------------------|--------------------------------------|
| Home        | `/`              | Browse candidates & vote             |
| Results     | `/results`       | Live vote standings per category     |
| Admin       | `/admin`         | Login, manage submissions, candidates|

---

## 📡 API Endpoints

| Method | Endpoint              | Auth  | Description                        |
|--------|-----------------------|-------|------------------------------------|
| POST   | `/api/admin/login`    | No    | Admin login                        |
| GET    | `/api/candidates`     | No    | List all candidates                |
| POST   | `/api/candidates`     | Admin | Add candidate (multipart/form-data)|
| DELETE | `/api/candidates/:id` | Admin | Delete candidate                   |
| GET    | `/api/categories`     | No    | List all categories                |
| POST   | `/api/categories`     | Admin | Add category                       |
| DELETE | `/api/categories/:id` | Admin | Delete category                    |
| POST   | `/api/submit-vote`    | No    | Submit a vote (pending)            |
| GET    | `/api/submissions`    | Admin | List all vote submissions          |
| POST   | `/api/approve/:id`    | Admin | Approve submission + add votes     |
| POST   | `/api/reject/:id`     | Admin | Reject submission                  |
| GET    | `/api/results`        | No    | Public results grouped by category |

Admin endpoints require header: `x-admin-token: admin-token-secret`

---

## 💳 Payment Flow

1. Student clicks **Vote Now** on a candidate
2. Modal shows **OPay payment details**:
   - Bank: OPay
   - Account Name: *(fill in your details)*
   - Account Number: *(fill in your details)*
3. Student pays any multiple of ₦200
4. Student fills in the form with their name, amount, and **OPay transaction reference**
5. Submission is saved as **pending**
6. Admin logs in, verifies the reference, and clicks **Approve**
7. Votes are added to the candidate's total

---

## 🖼️ Image Uploads

- Candidate images are uploaded via the Admin panel
- Stored locally in `backend/uploads/`
- Served at `http://localhost:5000/uploads/<filename>`
- Max file size: 5MB

---

## 🔧 Customization

### Update OPay account details
In `frontend/src/components/VoteModal.js`, find this section and update:
```jsx
<div><span>Account Name:</span> <strong>[ACCOUNT NAME]</strong></div>
<div><span>Account Number:</span> <strong>[ACCOUNT NUMBER]</strong></div>
```

### Change admin credentials
Update `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `backend/.env`

### Deploy to production
- Backend: Deploy to **Railway**, **Render**, or **Heroku**
- Frontend: Deploy to **Vercel** or **Netlify**
- Set `REACT_APP_API_URL` in frontend `.env` to your deployed backend URL
- Use **MongoDB Atlas** for the database

---

## 🛠️ Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Frontend  | React 18, React Router  |
| Backend   | Node.js, Express        |
| Database  | MongoDB, Mongoose       |
| Uploads   | Multer (local storage)  |
| Styling   | Custom CSS (no library) |
| Fonts     | Playfair Display, DM Sans |
