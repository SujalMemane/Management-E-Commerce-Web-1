# 🔥 Quick Firestore Setup Guide

## Step-by-Step Setup (5 minutes)

### 1️⃣ Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **management-e-commerce-we-b8dda**
3. Click **Firestore Database** in left sidebar
4. Click **Create Database** button
5. Select **Start in production mode**
6. Choose location: **us-central** (or closest to you)
7. Click **Enable**

### 2️⃣ Set Security Rules

1. In Firestore Database, click **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId);
      allow delete: if false;
      
      match /activities/{activityId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

3. Click **Publish**

### 3️⃣ Test the Integration

1. Start local server:
   ```bash
   python -m http.server 8000
   ```

2. Open `http://localhost:8000/test-firestore.html`

3. Click "Go to Login Page" and login

4. Come back to test page

5. Click "Get My Profile" - you should see your user data!

### 4️⃣ Verify in Firebase Console

1. Go to Firestore Database → Data tab
2. You should see:
   - `users` collection
   - Your user document (with your UID as document ID)
   - Contains: email, displayName, role, timestamps, etc.

## ✅ That's It!

Your Firestore is now integrated and working!

## 🧪 What to Test

- ✅ Create new account → Check Firestore for new user document
- ✅ Update profile → See changes in Firestore
- ✅ Log activity → Check activities subcollection
- ✅ Update preferences → See preferences updated

## 🐛 Troubleshooting

**Error: "Missing or insufficient permissions"**
- Make sure you published the security rules
- Make sure you're logged in

**Profile not created**
- Check browser console for errors
- Verify Firestore is enabled
- Make sure using http://localhost not file://

**Can't see data in Firestore Console**
- Wait a few seconds and refresh
- Check you're looking at the right project
- Verify user is authenticated

## 📚 Next Steps

Read `FIRESTORE_INTEGRATION.md` for:
- Complete API documentation
- All available functions
- Advanced usage examples
- Best practices
