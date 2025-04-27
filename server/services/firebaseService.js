const { db, admin } = require('../config/firebase');

/**
 * Service for common Firebase operations
 */
class FirebaseService {
  /**
   * Create a document in a collection
   * @param {string} collection - Collection name
   * @param {Object} data - Document data
   * @param {string} [id] - Optional document ID
   * @returns {Promise<Object>} Created document with ID
   */
  static async createDocument(collection, data, id = null) {
    try {
      let docRef;
      
      if (id) {
        // Create with specific ID
        docRef = db.collection(collection).doc(id);
        await docRef.set(data);
      } else {
        // Auto-generate ID
        docRef = await db.collection(collection).add(data);
      }
      
      return {
        id: docRef.id,
        ...data
      };
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Document data or null if not found
   */
  static async getDocument(collection, id) {
    try {
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error(`Error getting document from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @param {Object} data - Data to update
   * @returns {Promise<boolean>} Success status
   */
  static async updateDocument(collection, id, data) {
    try {
      const docRef = db.collection(collection).doc(id);
      await docRef.update(data);
      return true;
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param {string} collection - Collection name
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteDocument(collection, id) {
    try {
      const docRef = db.collection(collection).doc(id);
      await docRef.delete();
      return true;
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Query documents in a collection
   * @param {string} collection - Collection name
   * @param {Array} conditions - Array of condition arrays [field, operator, value]
   * @param {Object} [options] - Query options
   * @param {string} [options.orderByField] - Field to order by
   * @param {string} [options.orderByDirection] - Order direction ('asc' or 'desc')
   * @param {number} [options.limit] - Maximum number of documents to return
   * @returns {Promise<Array>} Array of documents
   */
  static async queryDocuments(collection, conditions = [], options = {}) {
    try {
      let query = db.collection(collection);
      
      // Apply conditions
      conditions.forEach(([field, operator, value]) => {
        query = query.where(field, operator, value);
      });
      
      // Apply ordering
      if (options.orderByField) {
        const direction = options.orderByDirection || 'asc';
        query = query.orderBy(options.orderByField, direction);
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      const snapshot = await query.get();
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return documents;
    } catch (error) {
      console.error(`Error querying documents from ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Get user by ID from Firebase Auth
   * @param {string} uid - User ID
   * @returns {Promise<Object>} User record
   */
  static async getUserAuth(uid) {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      console.error('Error getting user from Auth:', error);
      throw error;
    }
  }

  /**
   * Create user in Firebase Auth
   * @param {Object} userData - User data
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} [userData.displayName] - User display name
   * @returns {Promise<Object>} Created user record
   */
  static async createUserAuth(userData) {
    try {
      const userRecord = await admin.auth().createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName || null
      });
      
      return userRecord;
    } catch (error) {
      console.error('Error creating user in Auth:', error);
      throw error;
    }
  }

  /**
   * Update user in Firebase Auth
   * @param {string} uid - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user record
   */
  static async updateUserAuth(uid, userData) {
    try {
      const userRecord = await admin.auth().updateUser(uid, userData);
      return userRecord;
    } catch (error) {
      console.error('Error updating user in Auth:', error);
      throw error;
    }
  }

  /**
   * Batch write multiple operations
   * @param {Array} operations - Array of operations
   * @param {string} operations[].type - Operation type (create, update, delete)
   * @param {string} operations[].collection - Collection name
   * @param {string} operations[].id - Document ID
   * @param {Object} [operations[].data] - Document data (for create/update)
   * @returns {Promise<boolean>} Success status
   */
  static async batchWrite(operations) {
    try {
      const batch = db.batch();
      
      operations.forEach(op => {
        const docRef = db.collection(op.collection).doc(op.id);
        
        switch (op.type) {
          case 'create':
            batch.set(docRef, op.data);
            break;
          case 'update':
            batch.update(docRef, op.data);
            break;
          case 'delete':
            batch.delete(docRef);
            break;
          default:
            throw new Error(`Invalid operation type: ${op.type}`);
        }
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error executing batch write:', error);
      throw error;
    }
  }
}

module.exports = FirebaseService;
