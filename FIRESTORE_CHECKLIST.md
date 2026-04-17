# 🔥 Firestore Setup Checklist

## ✅ Step-by-Step Checklist

### 1. Enable Firestore Database
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Select project: **management-e-commerce-we-b8dda**
- [ ] Click **Firestore Database** in left sidebar
- [ ] Click **Create Database** button
- [ ] Select **Start in production mode**
- [ ] Choose location (e.g., us-central)
- [ ] Click **Enable**
- [ ] Wait for database to be created (takes 1-2 minutes)

### 2. Set Security Rules
- [ ] In Firestore Database, click **Rules** tab
- [ ] Delete all existing rules
- [ ] Copy rules from `FIRESTORE_SETUP.md` or below
- [ ] Paste into the rules editor
- [ ] Click **Publish** button
- [ ] Wait for "Rules published successfully" message

### 3. Test the Integration
- [ ] Start local server: `python -m http.server 8000`
- [ ] Open `http://localhost:8000/test-firestore-simple.html`
- [ ] Login with your account
- [ ] Click "Test Write to Firestore" button
- [ ] Check console output for errors

### 4. Verify in Firebase Console
- [ ] Go to Firestore Database → **Data** tab
- [ ] You should see:
  - `test` collection with `test-doc`
  - `users` collection with your user document

---

## 🔥 Security Rules (Copy This)

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
    
    match /test/{document=**} {
      allow read, write: if isAuthenticated();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 🐛 Common Issues

### Issue: "Your database is ready to go. Just add data."
**Cause:** No data has been written yet
**Solution:** 
1. Make sure you're logged in
2. Open browser console (F12)
3. Create a new account
4. Check console for errors
5. Use test-firestore-simple.html to diagnose

### Issue: "permission-denied" error
**Cause:** Security rules are blocking writes
**Solution:**
1. Go to Firestore → Rules
2. Make sure rules are published
3. Check rules match the ones above
4. Click Publish again

### Issue: "unavailable" error
**Cause:** Firestore is not enabled
**Solution:**
1. Go to Firestore Database
2. Click "Create Database"
3. Follow setup wizard

### Issue: No errors but no data
**Cause:** Code is not executing
**Solution:**
1. Open browser console (F12)
2. Look for console.log messages
3. Check Network tab for Firestore requests
4. Make sure using http://localhost not file://

---

## 🧪 Quick Test Commands

Open browser console (F12) and run:

```javascript
// Test 1: Check if Firestore is initialized
import { db } from './js/firebase-config.js';
console.log('Firestore:', db);

// Test 2: Check current user
import { getCurrentUser } from './js/auth.js';
console.log('User:', getCurrentUser());

// Test 3: Try manual write
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
const testRef = doc(db, 'test', 'manual-test');
await setDoc(testRef, { test: 'hello' });
console.log('Write successful!');
```

---

## 📞 Need Help?

Share:
1. Screenshot of Firestore Console (showing empty database)
2. Screenshot of browser console (F12) after creating account
3. Screenshot of Firestore Rules tab
4. Output from test-firestore-simple.html
