// Firestore Database Module
// Handles all database operations for user data

import { db } from './firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ==================== USER MANAGEMENT ====================

/**
 * Create a new user profile in Firestore
 * Called automatically after successful signup
 */
export async function createUserProfile(userId, userData) {
    try {
        console.log('📝 Creating user profile in Firestore...');
        console.log('User ID:', userId);
        console.log('User Data:', userData);
        
        const userRef = doc(db, 'users', userId);
        
        const userProfile = {
            uid: userId,
            email: userData.email,
            displayName: userData.displayName || '',
            role: userData.role || 'admin', // Default role
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isActive: true,
            // Additional profile fields
            photoURL: userData.photoURL || '',
            phoneNumber: userData.phoneNumber || '',
            // Preferences
            preferences: {
                emailNotifications: true,
                lowStockAlerts: true,
                marketingUpdates: false
            }
        };
        
        console.log('Writing to Firestore...');
        await setDoc(userRef, userProfile);
        
        console.log('✅ User profile created successfully in Firestore!');
        return { success: true, data: userProfile };
    } catch (error) {
        console.error('❌ Error creating user profile in Firestore:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return { success: true, data: userSnap.data() };
        } else {
            return { success: false, error: 'User profile not found' };
        }
    } catch (error) {
        console.error('Error getting user profile:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(userId, updates) {
    try {
        const userRef = doc(db, 'users', userId);
        
        const updateData = {
            ...updates,
            updatedAt: serverTimestamp()
        };
        
        await updateDoc(userRef, updateData);
        
        console.log('User profile updated successfully:', userId);
        return { success: true };
    } catch (error) {
        console.error('Error updating user profile:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete user profile from Firestore
 */
export async function deleteUserProfile(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        
        console.log('User profile deleted successfully:', userId);
        return { success: true };
    } catch (error) {
        console.error('Error deleting user profile:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers() {
    try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        return { success: true, data: users };
    } catch (error) {
        console.error('Error getting all users:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Search users by email
 */
export async function searchUserByEmail(email) {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        return { success: true, data: users };
    } catch (error) {
        console.error('Error searching user by email:', error);
        return { success: false, error: error.message };
    }
}

// ==================== USER PREFERENCES ====================

/**
 * Update user preferences
 */
export async function updateUserPreferences(userId, preferences) {
    try {
        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, {
            preferences: preferences,
            updatedAt: serverTimestamp()
        });
        
        console.log('User preferences updated successfully:', userId);
        return { success: true };
    } catch (error) {
        console.error('Error updating user preferences:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            return { success: true, data: userData.preferences || {} };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Error getting user preferences:', error);
        return { success: false, error: error.message };
    }
}

// ==================== ACTIVITY LOGGING ====================

/**
 * Log user activity
 */
export async function logUserActivity(userId, activity) {
    try {
        const activityRef = collection(db, 'users', userId, 'activities');
        
        const activityData = {
            ...activity,
            timestamp: serverTimestamp(),
            userId: userId
        };
        
        await setDoc(doc(activityRef), activityData);
        
        return { success: true };
    } catch (error) {
        console.error('Error logging user activity:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get user activity history
 */
export async function getUserActivityHistory(userId, limit = 50) {
    try {
        const activityRef = collection(db, 'users', userId, 'activities');
        const querySnapshot = await getDocs(activityRef);
        
        const activities = [];
        querySnapshot.forEach((doc) => {
            activities.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by timestamp (most recent first)
        activities.sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return b.timestamp.toMillis() - a.timestamp.toMillis();
        });
        
        return { success: true, data: activities.slice(0, limit) };
    } catch (error) {
        console.error('Error getting user activity history:', error);
        return { success: false, error: error.message };
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if user profile exists
 */
export async function userProfileExists(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        return userSnap.exists();
    } catch (error) {
        console.error('Error checking user profile existence:', error);
        return false;
    }
}

/**
 * Convert Firestore Timestamp to JavaScript Date
 */
export function timestampToDate(timestamp) {
    if (timestamp && timestamp.toDate) {
        return timestamp.toDate();
    }
    return null;
}

/**
 * Format date for display
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    
    if (date.toDate) {
        date = date.toDate();
    }
    
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}
