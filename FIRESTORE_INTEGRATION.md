# Firestore Database Integration Guide

## 🎯 Overview

Cloud Firestore has been integrated into ForgeAdmin to store and manage user data. Every user who signs up or logs in with Google will have their profile automatically stored in Firestore.

---

## 📁 Files Added/Modified

### New Files Created

1. **`js/firestore-db.js`**
   - Complete Firestore database module
   - User profile management functions
   - Activity logging
   - Preferences management

### Modified Files

1. **`js/firebase-config.js`**
   - Added Firestore initialization
   - Exports `db` instance

2. **`js/auth.js`**
   - Integrated Firestore profile creation on signup
   - Automatic profile creation for Google sign-in users

---

## 🔥 Firestore Setup Required

### Step 1: Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `management-e-commerce-we-b8dda`
3. Click on **Firestore Database** in the left menu
4. Click **Create Database**
5. Choose **Start in production mode** (we'll set rules next)
6. Select a location (choose closest to your users)
7. Click **Enable**

### Step 2: Set Firestore Security Rules

Go to **Firestore Database** → **Rules** tab and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Allow users to read their own profile
      allow read: if isOwner(userId);
      
      // Allow users to create their own profile during signup
      allow create: if isAuthenticated() && request.auth.uid == userId;
      
      // Allow users to update their own profile
      allow update: if isOwner(userId);
      
      // Don't allow users to delete their own profile
      // (should be done through admin or Firebase Auth)
      allow delete: if false;
      
      // User activities subcollection
      match /activities/{activityId} {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId);
      }
    }
    
    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish** to save the rules.

---

## 📊 Database Structure

### Users Collection

Each user document is stored at: `users/{userId}`

**Document Structure:**
```javascript
{
  uid: "user-unique-id",
  email: "user@example.com",
  displayName: "John Doe",
  role: "admin",
  photoURL: "",
  phoneNumber: "",
  createdAt: Timestamp,
  updatedAt: Timestamp,
  isActive: true,
  preferences: {
    emailNotifications: true,
    lowStockAlerts: true,
    marketingUpdates: false
  }
}
```

### User Activities Subcollection

Activity logs are stored at: `users/{userId}/activities/{activityId}`

**Document Structure:**
```javascript
{
  userId: "user-unique-id",
  action: "login" | "logout" | "profile_update" | "settings_change",
  description: "User logged in",
  timestamp: Timestamp,
  metadata: {
    // Additional activity-specific data
  }
}
```

---

## 🔧 Available Functions

### User Profile Management

#### Create User Profile
```javascript
import { createUserProfile } from './js/firestore-db.js';

const result = await createUserProfile(userId, {
  email: 'user@example.com',
  displayName: 'John Doe',
  role: 'admin'
});
```

#### Get User Profile
```javascript
import { getUserProfile } from './js/firestore-db.js';

const result = await getUserProfile(userId);
if (result.success) {
  console.log('User data:', result.data);
}
```

#### Update User Profile
```javascript
import { updateUserProfile } from './js/firestore-db.js';

const result = await updateUserProfile(userId, {
  displayName: 'Jane Doe',
  phoneNumber: '+1234567890'
});
```

#### Delete User Profile
```javascript
import { deleteUserProfile } from './js/firestore-db.js';

const result = await deleteUserProfile(userId);
```

#### Get All Users (Admin)
```javascript
import { getAllUsers } from './js/firestore-db.js';

const result = await getAllUsers();
if (result.success) {
  console.log('All users:', result.data);
}
```

#### Search User by Email
```javascript
import { searchUserByEmail } from './js/firestore-db.js';

const result = await searchUserByEmail('user@example.com');
```

### User Preferences

#### Update Preferences
```javascript
import { updateUserPreferences } from './js/firestore-db.js';

const result = await updateUserPreferences(userId, {
  emailNotifications: false,
  lowStockAlerts: true,
  marketingUpdates: true
});
```

#### Get Preferences
```javascript
import { getUserPreferences } from './js/firestore-db.js';

const result = await getUserPreferences(userId);
if (result.success) {
  console.log('Preferences:', result.data);
}
```

### Activity Logging

#### Log Activity
```javascript
import { logUserActivity } from './js/firestore-db.js';

const result = await logUserActivity(userId, {
  action: 'login',
  description: 'User logged in successfully',
  metadata: {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  }
});
```

#### Get Activity History
```javascript
import { getUserActivityHistory } from './js/firestore-db.js';

const result = await getUserActivityHistory(userId, 50); // Last 50 activities
if (result.success) {
  console.log('Activities:', result.data);
}
```

### Utility Functions

#### Check if Profile Exists
```javascript
import { userProfileExists } from './js/firestore-db.js';

const exists = await userProfileExists(userId);
```

#### Format Timestamp
```javascript
import { formatDate } from './js/firestore-db.js';

const formattedDate = formatDate(firestoreTimestamp);
// Output: "Jan 15, 2025, 10:30 AM"
```

---

## 🎯 How It Works

### Signup Flow with Firestore

1. User fills signup form
2. Firebase Authentication creates account
3. **Automatically creates Firestore profile** with:
   - User ID (from Auth)
   - Email
   - Display name
   - Default role: 'admin'
   - Creation timestamp
   - Default preferences

### Login Flow with Firestore

1. User logs in with email/password or Google
2. Authentication succeeds
3. For Google sign-in: **Checks if profile exists**
   - If not, creates profile automatically
4. User data is available throughout the app

### Profile Updates

Users can update their profile from the Settings page:
- Display name
- Phone number
- Email preferences
- Notification settings

All updates are automatically saved to Firestore with timestamp.

---

## 📝 Example: Display User Data on Dashboard

```javascript
import { getCurrentUser } from './js/auth.js';
import { getUserProfile } from './js/firestore-db.js';

// Get current authenticated user
const user = getCurrentUser();

if (user) {
  // Get full profile from Firestore
  const result = await getUserProfile(user.uid);
  
  if (result.success) {
    const profile = result.data;
    
    // Display user data
    document.getElementById('user-name').textContent = profile.displayName;
    document.getElementById('user-email').textContent = profile.email;
    document.getElementById('user-role').textContent = profile.role;
    document.getElementById('member-since').textContent = formatDate(profile.createdAt);
  }
}
```

---

## 🧪 Testing Firestore Integration

### Test 1: Create Account and Check Firestore

1. Open `http://localhost:8000/pages/signup.html`
2. Create a new account
3. Go to Firebase Console → Firestore Database
4. You should see a new document in `users` collection
5. Document ID = User's UID
6. Contains email, displayName, role, timestamps, etc.

### Test 2: Update Profile

```javascript
import { getCurrentUser } from './js/auth.js';
import { updateUserProfile } from './js/firestore-db.js';

const user = getCurrentUser();
if (user) {
  await updateUserProfile(user.uid, {
    phoneNumber: '+1234567890',
    displayName: 'Updated Name'
  });
}
```

Check Firestore Console - document should be updated!

### Test 3: Log Activity

```javascript
import { getCurrentUser } from './js/auth.js';
import { logUserActivity } from './js/firestore-db.js';

const user = getCurrentUser();
if (user) {
  await logUserActivity(user.uid, {
    action: 'page_view',
    description: 'Viewed dashboard',
    metadata: { page: 'dashboard' }
  });
}
```

Check Firestore Console → users/{userId}/activities - new activity logged!

---

## 🔒 Security Best Practices

1. **Never expose sensitive data** in Firestore documents
2. **Use Security Rules** to restrict access (already configured)
3. **Validate data** before writing to Firestore
4. **Use server timestamps** for accurate time tracking
5. **Limit query results** to prevent excessive reads

---

## 📊 Firestore Pricing

**Free Tier Includes:**
- 50,000 document reads/day
- 20,000 document writes/day
- 20,000 document deletes/day
- 1 GB storage

For a small admin dashboard, this is more than enough!

---

## 🐛 Troubleshooting

### Error: "Missing or insufficient permissions"
**Solution:** Check Firestore Security Rules. Make sure user is authenticated and rules allow the operation.

### Error: "Firestore is not initialized"
**Solution:** Make sure you're using `http://localhost` not `file://` protocol.

### Profile not created after signup
**Solution:** 
1. Check browser console for errors
2. Verify Firestore is enabled in Firebase Console
3. Check Security Rules allow user creation

### Can't read user data
**Solution:**
1. Make sure user is logged in
2. Check Security Rules allow read access
3. Verify document exists in Firestore Console

---

## ✅ Summary

✅ **Firestore integrated** with Firebase Authentication
✅ **Automatic profile creation** on signup
✅ **User data storage** with timestamps
✅ **Activity logging** capability
✅ **Preferences management** ready
✅ **Security rules** configured
✅ **Zero UI changes** - all backend integration

Your ForgeAdmin now has a complete database backend for user management!
