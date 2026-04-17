// Firebase Authentication Module
// Handles all authentication operations

import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { createUserProfile, getUserProfile } from './firestore-db.js';

// ==================== UTILITY FUNCTIONS ====================

/**
 * Display error message to user
 */
function showError(message, elementId = 'auth-error') {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        errorElement.classList.add('block');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorElement.classList.add('hidden');
        }, 5000);
    } else {
        alert(message);
    }
}

/**
 * Display success message to user
 */
function showSuccess(message, elementId = 'auth-success') {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.classList.remove('hidden');
        successElement.classList.add('block');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            successElement.classList.add('hidden');
        }, 3000);
    }
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Invalid email address format.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/operation-not-allowed': 'Operation not allowed. Please contact support.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed before completion.',
        'auth/cancelled-popup-request': 'Only one popup request is allowed at a time.',
        'auth/popup-blocked': 'Sign-in popup was blocked by the browser.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength
 */
function isStrongPassword(password) {
    return password.length >= 6;
}

/**
 * Set loading state on button
 */
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
    }
}

// ==================== AUTHENTICATION FUNCTIONS ====================

/**
 * Sign up new user with email and password
 */
export async function signUpUser(email, password, displayName = '') {
    try {
        // Validate inputs
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        
        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        if (!isStrongPassword(password)) {
            throw new Error('Password must be at least 6 characters long.');
        }
        
        console.log('Creating user account...');
        
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        console.log('User account created:', userCredential.user.uid);
        
        // Update display name if provided
        if (displayName) {
            console.log('Updating display name...');
            await updateProfile(userCredential.user, {
                displayName: displayName
            });
            console.log('Display name updated');
        }
        
        // Create user profile in Firestore
        console.log('Creating Firestore profile...');
        const profileData = {
            email: email,
            displayName: displayName,
            role: 'admin' // Default role for new users
        };
        
        const firestoreResult = await createUserProfile(userCredential.user.uid, profileData);
        
        if (firestoreResult.success) {
            console.log('✅ Firestore profile created successfully!');
        } else {
            console.error('❌ Firestore profile creation failed:', firestoreResult.error);
            // Don't fail the signup if Firestore fails, just log it
        }
        
        console.log('User account and profile created successfully');
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message || getErrorMessage(error.code) };
    }
}

/**
 * Sign in existing user with email and password
 */
export async function signInUser(email, password) {
    try {
        // Validate inputs
        if (!email || !password) {
            throw new Error('Email and password are required.');
        }
        
        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        // Sign in user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Sign out error:', error);
        return { success: false, error: 'Failed to sign out. Please try again.' };
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
    try {
        if (!email) {
            throw new Error('Email address is required.');
        }
        
        if (!isValidEmail(email)) {
            throw new Error('Please enter a valid email address.');
        }
        
        await sendPasswordResetEmail(auth, email);
        
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        
        // Check if user profile exists in Firestore, if not create one
        const profileResult = await getUserProfile(userCredential.user.uid);
        
        if (!profileResult.success) {
            // Create profile for Google sign-in user
            const profileData = {
                email: userCredential.user.email,
                displayName: userCredential.user.displayName,
                photoURL: userCredential.user.photoURL,
                role: 'admin'
            };
            
            await createUserProfile(userCredential.user.uid, profileData);
        }
        
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Google sign in error:', error);
        return { success: false, error: getErrorMessage(error.code) };
    }
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
    return auth.currentUser !== null;
}

/**
 * Listen to authentication state changes
 */
export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

// Export utility functions for use in other modules
export { showError, showSuccess, setButtonLoading };
