/**
 * ForgeAdmin — Cart Service
 * Handles shopping cart operations and abandoned cart tracking
 */

import { db } from './firebase-config.js';
import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ═══════════════════════════════════════════════════════════════
// CART MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Save or update a customer's cart
 */
export async function saveCart(customerId, cartItems, customerEmail, customerName) {
  try {
    const cartRef = doc(db, 'carts', customerId);
    
    const cartData = {
      customerId,
      customerEmail,
      customerName,
      items: cartItems,
      itemCount: cartItems.length,
      totalValue: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      lastInteractionAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      status: 'active', // active, recovered, converted, expired
      recoveryAttempts: 0,
      recoveryCouponCode: null,
      recoveryCouponSent: false
    };
    
    await setDoc(cartRef, cartData, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving cart:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a specific cart
 */
export async function getCart(customerId) {
  try {
    const cartRef = doc(db, 'carts', customerId);
    const cartSnap = await getDoc(cartRef);
    
    if (cartSnap.exists()) {
      return { success: true, data: { id: cartSnap.id, ...cartSnap.data() } };
    }
    return { success: false, error: 'Cart not found' };
  } catch (error) {
    console.error('Error getting cart:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear a cart (when order is completed)
 */
export async function clearCart(customerId) {
  try {
    const cartRef = doc(db, 'carts', customerId);
    await deleteDoc(cartRef);
    return { success: true };
  } catch (error) {
    console.error('Error clearing cart:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark cart as converted (order completed)
 */
export async function markCartConverted(customerId) {
  try {
    const cartRef = doc(db, 'carts', customerId);
    await setDoc(cartRef, {
      status: 'converted',
      convertedAt: serverTimestamp()
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error marking cart as converted:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// ABANDONED CART DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Get all abandoned carts (older than 24 hours, status = active)
 */
export async function getAbandonedCarts() {
  try {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const cartsRef = collection(db, 'carts');
    const q = query(
      cartsRef,
      where('status', '==', 'active'),
      where('lastInteractionAt', '<', Timestamp.fromDate(twentyFourHoursAgo)),
      orderBy('lastInteractionAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const carts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return { success: true, data: carts };
  } catch (error) {
    console.error('Error getting abandoned carts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all carts with statistics
 */
export async function getAllCarts({ status = '' } = {}) {
  try {
    const cartsRef = collection(db, 'carts');
    let q;
    
    if (status) {
      q = query(cartsRef, where('status', '==', status), orderBy('lastInteractionAt', 'desc'));
    } else {
      q = query(cartsRef, orderBy('lastInteractionAt', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const carts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return { success: true, data: carts };
  } catch (error) {
    console.error('Error getting all carts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get abandoned cart statistics
 */
export async function getAbandonedCartStats() {
  try {
    const cartsRef = collection(db, 'carts');
    const snapshot = await getDocs(cartsRef);
    
    let totalAbandoned = 0;
    let totalValue = 0;
    let recovered = 0;
    let recoveredValue = 0;
    let pendingRecovery = 0;
    let pendingValue = 0;
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    snapshot.docs.forEach(doc => {
      const cart = doc.data();
      const lastInteraction = cart.lastInteractionAt?.toDate();
      
      if (lastInteraction && lastInteraction < twentyFourHoursAgo) {
        totalAbandoned++;
        totalValue += cart.totalValue || 0;
        
        if (cart.status === 'recovered') {
          recovered++;
          recoveredValue += cart.totalValue || 0;
        } else if (cart.status === 'active') {
          pendingRecovery++;
          pendingValue += cart.totalValue || 0;
        }
      }
    });
    
    const recoveryRate = totalAbandoned > 0 ? ((recovered / totalAbandoned) * 100).toFixed(1) : 0;
    
    return {
      success: true,
      data: {
        totalAbandoned,
        totalValue,
        recovered,
        recoveredValue,
        pendingRecovery,
        pendingValue,
        recoveryRate: parseFloat(recoveryRate)
      }
    };
  } catch (error) {
    console.error('Error getting abandoned cart stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark cart as recovery attempted
 */
export async function markRecoveryAttempt(cartId, couponCode) {
  try {
    const cartRef = doc(db, 'carts', cartId);
    const cartSnap = await getDoc(cartRef);
    
    if (!cartSnap.exists()) {
      return { success: false, error: 'Cart not found' };
    }
    
    const currentAttempts = cartSnap.data().recoveryAttempts || 0;
    
    await setDoc(cartRef, {
      recoveryAttempts: currentAttempts + 1,
      recoveryCouponCode: couponCode,
      recoveryCouponSent: true,
      lastRecoveryAttemptAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error marking recovery attempt:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark cart as recovered (customer used the coupon)
 */
export async function markCartRecovered(cartId) {
  try {
    const cartRef = doc(db, 'carts', cartId);
    await setDoc(cartRef, {
      status: 'recovered',
      recoveredAt: serverTimestamp()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error marking cart as recovered:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// RECOVERY EMAIL GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate recovery coupon code
 */
export function generateRecoveryCouponCode(customerName) {
  const name = customerName.split(' ')[0].toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${name}-COMEBACK-${random}`;
}

/**
 * Generate recovery email content
 */
export function generateRecoveryEmail(cart, couponCode) {
  const itemsList = cart.items.map(item => 
    `- ${item.name} (${item.quantity}x) - $${(item.price * item.quantity).toFixed(2)}`
  ).join('\n');
  
  return {
    to: cart.customerEmail,
    subject: `${cart.customerName}, you left something behind! 🛒`,
    body: `
Hi ${cart.customerName},

We noticed you left some great items in your cart at BackForge Store!

Your Cart:
${itemsList}

Total Value: $${cart.totalValue.toFixed(2)}

Don't worry - we saved your cart for you! Plus, here's a special 10% discount code just for you:

🎁 ${couponCode}

This code is valid for the next 48 hours and can only be used once.

Click here to complete your order: [Complete Your Order]

Questions? Reply to this email and we'll be happy to help!

Best regards,
The BackForge Team

---
This is an automated message. If you've already completed your order, please disregard this email.
    `.trim()
  };
}
