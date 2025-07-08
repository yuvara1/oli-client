import React, { useState, useEffect } from 'react';
import './Admin.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { IoMdCloudUpload } from 'react-icons/io';
import { IoPersonOutline, IoLogOutOutline, IoSettingsOutline } from 'react-icons/io5';
import AddMovie from '../Upload/AddMovie/AddMovie';
import AddSeries from '../Upload/AddSeries/AddSeries';
import UserProfile from '../Auth/UserProfile';
import { current } from '@reduxjs/toolkit';

function Admin() {
     const DOMAIN = import.meta.env.VITE_DOMAIN || 'http://localhost:3000';
     const [tables, setTables] = useState([]);
     const [selectedTable, setSelectedTable] = useState('');
     const [tableData, setTableData] = useState([]);
     const [tableStructure, setTableStructure] = useState([]);
     const [dashboardStats, setDashboardStats] = useState({});
     const [loading, setLoading] = useState(true);
     const [tableCount, setTableCount] = useState(0);
     const [dataLimit, setDataLimit] = useState(10);
     const [searchTerm, setSearchTerm] = useState('');
     const [editingRow, setEditingRow] = useState(null);
     const [editFormData, setEditFormData] = useState({});
     const [showEditModal, setShowEditModal] = useState(false);
     const [showAddModal, setShowAddModal] = useState(false);
     const [showAddColumnModal, setShowAddColumnModal] = useState(false);
     const [newRowData, setNewRowData] = useState({});

     // Get user data from cookie
     const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) {
               try {
                    return JSON.parse(decodeURIComponent(parts.pop().split(';').shift()));
               } catch (error) {
                    console.error('Error parsing cookie:', error);
                    return null;
               }
          }
          return null;
     };

     const [currentUser, setCurrentUser] = useState(getCookie('user'));

     // New column form data
     const [newColumnData, setNewColumnData] = useState({
          columnName: '',
          columnType: 'VARCHAR(255)',
          isNullable: true,
          defaultValue: '',
          extra: ''
     });

     // Upload states
     const [showUploadMovieModal, setShowUploadMovieModal] = useState(false);
     const [showUploadSeriesModal, setShowUploadSeriesModal] = useState(false);

     const navigate = useNavigate();

     useEffect(() => {
          fetchTables();
          fetchDashboardStats();

          // Check if user has admin access
          if (!currentUser || currentUser.access >= 3 && currentUser.access <= 0) {
               alert('Access denied. Admin privileges required.');
               navigate('/');
               return;
          }
     }, [currentUser, navigate]);
     console.log('current user', currentUser);

     // Handle user logout
     const handleLogout = () => {
          // Clear cookies
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          // Clear localStorage
          localStorage.clear();
          // Navigate to home
          navigate('/');
     };

     const fetchTables = async () => {
          try {
               const response = await axios.get(`${DOMAIN}/admin/list-tables`);
               setTables(response.data);
               console.log('Tables fetched:', response.data);
          } catch (error) {
               console.error("Error fetching tables:", error);
          } finally {
               setLoading(false);
          }
     };

     const fetchDashboardStats = async () => {
          try {
               const response = await axios.get(`${DOMAIN}/admin/dashboard-stats`);
               setDashboardStats(response.data);
          } catch (error) {
               console.error("Error fetching dashboard stats:", error);
          }
     };

     const handleTableSelect = async (tableName) => {
          setSelectedTable(tableName);
          try {
               // Fetch table structure
               const structureResponse = await axios.get(`${DOMAIN}/admin/describe-table/${tableName}`);
               setTableStructure(structureResponse.data);

               // Fetch table data
               const dataResponse = await axios.get(`${DOMAIN}/admin/table-data/${tableName}?limit=${dataLimit}`);
               setTableData(dataResponse.data);

               // Fetch table count
               const countResponse = await axios.get(`${DOMAIN}/admin/table-count/${tableName}`);
               setTableCount(countResponse.data.count);
          } catch (error) {
               console.error("Error fetching table details:", error);
          }
     };

     const handleLimitChange = async (newLimit) => {
          setDataLimit(newLimit);
          if (selectedTable) {
               try {
                    const dataResponse = await axios.get(`${DOMAIN}/admin/table-data/${selectedTable}?limit=${newLimit}`);
                    setTableData(dataResponse.data);
               } catch (error) {
                    console.error("Error fetching table data:", error);
               }
          }
     };

     const handleEdit = (row, index) => {
          setEditingRow(index);
          setEditFormData({ ...row });
          setShowEditModal(true);
     };

     const handleSaveEdit = async () => {
          try {
               const primaryKey = getPrimaryKey();
               if (!primaryKey) {
                    alert('Cannot edit: No primary key found');
                    return;
               }

               const response = await axios.put(`${DOMAIN}/admin/update-row/${selectedTable}`, {
                    primaryKey: primaryKey,
                    primaryKeyValue: editFormData[primaryKey],
                    data: editFormData
               });

               if (response.data.success) {
                    // Update local data
                    const newData = [...tableData];
                    newData[editingRow] = editFormData;
                    setTableData(newData);
                    setShowEditModal(false);
                    setEditingRow(null);
                    alert('Row updated successfully!');
               }
          } catch (error) {
               console.error('Error updating row:', error);
               alert('Error updating row: ' + (error.response?.data?.error || error.message));
          }
     };

     const handleDelete = async (row, index) => {
          if (!window.confirm('Are you sure you want to delete this row?')) {
               return;
          }

          try {
               const primaryKey = getPrimaryKey();
               if (!primaryKey) {
                    alert('Cannot delete: No primary key found');
                    return;
               }

               const response = await axios.delete(`${DOMAIN}/admin/delete-row/${selectedTable}`, {
                    data: {
                         primaryKey: primaryKey,
                         primaryKeyValue: row[primaryKey]
                    }
               });

               if (response.data.success) {
                    // Remove from local data
                    const newData = tableData.filter((_, i) => i !== index);
                    setTableData(newData);
                    setTableCount(tableCount - 1);
                    alert('Row deleted successfully!');
               }
          } catch (error) {
               console.error('Error deleting row:', error);
               alert('Error deleting row: ' + (error.response?.data?.error || error.message));
          }
     };

     const handleAddNew = () => {
          const newRow = {};
          tableStructure.forEach(field => {
               if (field.Extra !== 'auto_increment') {
                    newRow[field.Field] = '';
               }
          });
          setNewRowData(newRow);
          setShowAddModal(true);
     };

     const handleAddColumn = () => {
          if (!selectedTable) {
               alert('Please select a table first.');
               return;
          }

          setNewColumnData({
               columnName: '',
               columnType: 'VARCHAR(255)',
               isNullable: true,
               defaultValue: '',
               extra: ''
          });

          setShowAddColumnModal(true);
     };

     const handleSaveNewColumn = async () => {
          if (!newColumnData.columnName || !newColumnData.columnType) {
               alert('Column name and type are required');
               return;
          }

          try {
               const response = await axios.post(`${DOMAIN}/admin/add-column/${selectedTable}`, {
                    columnName: newColumnData.columnName,
                    columnType: newColumnData.columnType,
                    isNullable: newColumnData.isNullable,
                    defaultValue: newColumnData.defaultValue,
                    extra: newColumnData.extra
               });

               if (response.data.success) {
                    await handleTableSelect(selectedTable);
                    setShowAddColumnModal(false);
                    setNewColumnData({
                         columnName: '',
                         columnType: 'VARCHAR(255)',
                         isNullable: true,
                         defaultValue: '',
                         extra: ''
                    });
                    alert('Column added successfully!');
               }
          } catch (error) {
               console.error('Error adding column:', error);
               alert('Error adding column: ' + (error.response?.data?.error || error.message));
          }
     };

     const handleSaveNew = async () => {
          try {
               const response = await axios.post(`${DOMAIN}/admin/insert-row/${selectedTable}`, {
                    data: newRowData
               });

               if (response.data.success) {
                    handleTableSelect(selectedTable);
                    setShowAddModal(false);
                    setNewRowData({});
                    alert('New row added successfully!');
               }
          } catch (error) {
               console.error('Error adding new row:', error);
               alert('Error adding new row: ' + (error.response?.data?.error || error.message));
          }
     };

     const getPrimaryKey = () => {
          const primaryKeyField = tableStructure.find(field => field.Key === 'PRI');
          return primaryKeyField ? primaryKeyField.Field : null;
     };

     const filteredTables = tables.filter(table =>
          table.toLowerCase().includes(searchTerm.toLowerCase())
     );

     const formatValue = (value) => {
          if (value === null || value === undefined) return 'NULL';
          if (typeof value === 'string' && value.length > 50) {
               return value.substring(0, 50) + '...';
          }
          return String(value);
     };

     const refreshData = () => {
          fetchTables();
          fetchDashboardStats();
          if (selectedTable) {
               handleTableSelect(selectedTable);
          }
     };

     const handleUploadSuccess = () => {
          fetchDashboardStats();
          if (selectedTable === 'movies' || selectedTable === 'series') {
               handleTableSelect(selectedTable);
          }
          alert('Upload completed successfully!');
     };

     const renderInputField = (field, value, onChange, isNew = false) => {
          const fieldType = field.Type.toLowerCase();
          const isAutoIncrement = field.Extra === 'auto_increment';

          if (isAutoIncrement && isNew) {
               return <span className="auto-increment">AUTO</span>;
          }

          // Special handling for access field in users table
          if (selectedTable === 'users' && field.Field === 'access') {
               if (currentUser.access === 2) {
                    // User with access level 2 can only view access field (readonly)
                    return (
                         <input
                              type="number"
                              value={value || ''}
                              onChange={(e) => onChange(field.Field, e.target.value)}
                              disabled={isAutoIncrement}
                              readOnly={true}
                              className="readonly-access"
                              title="You don't have permission to modify access levels"
                         />
                    );
               } else if (currentUser.access === 1) {
                    // User with access level 1 can modify access field with dropdown
                    return (
                         <select
                              value={value || '0'}
                              onChange={(e) => onChange(field.Field, e.target.value)}
                              disabled={isAutoIncrement}
                              className="access-select"
                         >
                              <option value="0">User (0)</option>
                              <option value="1">Admin (1)</option>
                              <option value="2">Moderator (2)</option>
                         </select>
                    );
               } else {
                    // Hide access field for users with access level > 2
                    return null;
               }
          }

          // Regular field handling
          if (fieldType.includes('text') || fieldType.includes('varchar')) {
               return (
                    <input
                         type="text"
                         value={value || ''}
                         onChange={(e) => onChange(field.Field, e.target.value)}
                         disabled={isAutoIncrement}
                    />
               );
          } else if (fieldType.includes('int') || fieldType.includes('decimal') || fieldType.includes('float')) {
               return (
                    <input
                         type="number"
                         value={value || ''}
                         onChange={(e) => onChange(field.Field, e.target.value)}
                         disabled={isAutoIncrement}
                    />
               );
          } else if (fieldType.includes('bigint') || fieldType.includes('double')) {
               return (
                    <input
                         type="number"
                         step="any"
                         value={value || ''}
                         onChange={(e) => onChange(field.Field, e.target.value)}
                         disabled={isAutoIncrement}
                    />
               );
          } else if (fieldType.includes('date')) {
               return (
                    <input
                         type="date"
                         value={value || ''}
                         onChange={(e) => onChange(field.Field, e.target.value)}
                         disabled={isAutoIncrement}
                    />
               );
          } else if (fieldType.includes('time')) {
               return (
                    <input
                         type="datetime-local"
                         value={value || ''}
                         onChange={(e) => onChange(field.Field, e.target.value)}
                         disabled={isAutoIncrement}
                    />
               );
          } else if (fieldType.includes('tinyint(1)')) {
               return (
                    <select
                         value={value || '0'}
                         onChange={(e) => onChange(field.Field, e.target.value)}
                         disabled={isAutoIncrement}
                    >
                         <option value="0">False</option>
                         <option value="1">True</option>
                    </select>
               );
          } else {
               return (
                    <input
                         type="text"
                         value={value || ''}
                         onChange={(e) => onChange(field.Field, e.target.value)}
                         disabled={isAutoIncrement}
                    />
               );
          }
     };

     if (loading) {
          return (
               <div className="admin-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading admin panel...</p>
               </div>
          );
     }

     if (!currentUser) {
          return (
               <div className="admin-access-denied">
                    <h2>Access Denied</h2>
                    <p>Please login to access the admin panel.</p>
                    <button onClick={() => navigate('/')}>Go to Home</button>
               </div>
          );
     }

     return (
          <div className="admin-container">
               <div className="admin-panel">
                    <div className="admin-header">
                         <div className="admin-title">
                              <h1>Admin Panel - Database Management</h1>
                              <p>Welcome back, {currentUser.name || currentUser.username}!</p>
                         </div>
                         <div className="admin-header-actions">
                              <button className="refresh-btn" onClick={refreshData}>
                                   🔄 Refresh Data
                              </button>
                              {/* User Profile in Admin Panel */}
                              <div className="admin-user-profile">
                                   <UserProfile user={currentUser} onLogout={handleLogout} />
                              </div>
                         </div>
                    </div>

                    {/* User Info Card */}
                    <div className="admin-user-info">
                         <div className="user-info-card">
                              <div className="user-avatar-section">
                                   {currentUser.picture ? (
                                        <img
                                             src={currentUser.picture}
                                             alt={currentUser.name || currentUser.username}
                                             className="admin-user-avatar"
                                        />
                                   ) : (
                                        <div className="admin-user-avatar-fallback">
                                             <IoPersonOutline size={32} />
                                        </div>
                                   )}
                              </div>
                              <div className="user-details-section">
                                   <h3>{currentUser.name || currentUser.username}</h3>
                                   <p className="user-email">{currentUser.email}</p>
                                   <div className="user-badges">
                                        {currentUser.premium && <span className="badge premium">Premium</span>}
                                        {currentUser.access === 1 && <span className="badge admin">Admin</span>}
                                   </div>
                              </div>
                              <div className="user-actions-section">
                                   <p className="user-id">ID: {currentUser.id}</p>
                                   <p className="access-level">Access Level: {currentUser.access}</p>
                              </div>
                         </div>
                    </div>

                    {/* Dashboard Stats */}
                    <div className="dashboard-stats">
                         <h2>Dashboard Statistics</h2>
                         <div className="stats-grid">
                              <div className="stat-card">
                                   <h3>Total Users</h3>
                                   <p>{dashboardStats.users || 0}</p>
                              </div>
                              <div className="stat-card">
                                   <h3>Total Movies</h3>
                                   <p>{dashboardStats.movies || 0}</p>
                              </div>
                              <div className="stat-card">
                                   <h3>Total Series</h3>
                                   <p>{dashboardStats.series || 0}</p>
                              </div>
                              <div className="stat-card">
                                   <h3>Premium Users</h3>
                                   <p>{dashboardStats.premiumUsers || 0}</p>
                              </div>
                              <div className="stat-card">
                                   <h3>Total Orders</h3>
                                   <p>{dashboardStats.orders || 0}</p>
                              </div>
                         </div>
                    </div>

                    {/* Content Upload Section */}
                    <div className="uploads">
                         <h2>Content Management</h2>
                         <div className="upload-buttons">
                              <button
                                   className="upload-btn"
                                   onClick={() => setShowUploadMovieModal(true)}
                              >
                                   <IoMdCloudUpload size={24} /> Upload Movie
                              </button>
                              <button
                                   className="upload-btn"
                                   onClick={() => setShowUploadSeriesModal(true)}
                              >
                                   <IoMdCloudUpload size={24} /> Upload Series
                              </button>
                         </div>
                    </div>

                    {/* Tables List */}
                    <div className="tables-section">
                         <div className="tables-header">
                              <h2>Database Tables ({filteredTables.length})</h2>
                              <div className="search-box">
                                   <input
                                        type="text"
                                        placeholder="Search tables..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                   />
                              </div>
                         </div>
                         <div className="tables-grid">
                              {filteredTables.map((table, index) => (
                                   <div
                                        key={index}
                                        className={`table-card ${selectedTable === table ? 'selected' : ''}`}
                                        onClick={() => handleTableSelect(table)}
                                   >
                                        <h3>{table}</h3>
                                        <p>Click to view details</p>
                                   </div>
                              ))}
                         </div>
                    </div>

                    {/* Table Details */}
                    {selectedTable && (
                         <div className="table-details">
                              <div className="table-header">
                                   <h2>Table: {selectedTable}</h2>
                                   <div className="table-info">
                                        <span>Total Records: {tableCount}</span>
                                        <div className="table-actions">


                                             <div className="limit-controls">
                                                  <label>Show rows: </label>
                                                  <select
                                                       value={dataLimit}
                                                       onChange={(e) => handleLimitChange(Number(e.target.value))}
                                                  >
                                                       <option value={10}>10</option>
                                                       <option value={25}>25</option>
                                                       <option value={50}>50</option>
                                                       <option value={100}>100</option>
                                                  </select>
                                             </div>
                                        </div>
                                   </div>
                              </div>

                              {/* Table Structure */}
                              <div className="table-structure">
                                   <div className="table-header">
                                        <h3>Table Structure</h3>
                                        <button className='add-btn' onClick={handleAddColumn}>
                                             ➕ Add New Column
                                        </button>
                                   </div>
                                   <div className="structure-table-container">
                                        <table className="structure-table">
                                             <thead>
                                                  <tr>
                                                       <th>Field</th>
                                                       <th>Type</th>
                                                       <th>Null</th>
                                                       <th>Key</th>
                                                       <th>Default</th>
                                                       <th>Extra</th>
                                                  </tr>
                                             </thead>
                                             <tbody>
                                                  {tableStructure.map((field, index) => (
                                                       <tr key={index}>
                                                            <td className="field-name">{field.Field}</td>
                                                            <td className="field-type">{field.Type}</td>
                                                            <td className={field.Null === 'YES' ? 'null-yes' : 'null-no'}>
                                                                 {field.Null}
                                                            </td>
                                                            <td className={field.Key ? 'key-yes' : ''}>{field.Key}</td>
                                                            <td>{field.Default || 'NULL'}</td>
                                                            <td>{field.Extra}</td>
                                                       </tr>
                                                  ))}
                                             </tbody>
                                        </table>
                                   </div>
                              </div>

                              {/* Table Data */}
                              <div className="table-data">

                                   <div className="table-header">
                                        <h3>Data in {selectedTable}</h3>
                                        <button className='add-btn' onClick={handleAddNew}>
                                             ➕ Add New Row
                                        </button>
                                   </div>
                                   {tableData.length > 0 ? (
                                        <div className="data-table-container">
                                             <table className="data-table">
                                                  <thead>
                                                       <tr>
                                                            {Object.keys(tableData[0]).map((column, index) => {
                                                                 // Hide access column for users table if user has access > 2
                                                                 if (selectedTable === 'users' && column === 'access' && currentUser.access > 2) {
                                                                      return null;
                                                                 }
                                                                 return (
                                                                      <th
                                                                           key={index}
                                                                           className={`
                                                                                ${selectedTable === 'users' && column === 'access' ? 'access-column' : ''}
                                                                                ${selectedTable === 'users' && column === 'premium' ? 'premium-column' : ''}
                                                                           `}
                                                                      >
                                                                           {column}
                                                                           {selectedTable === 'users' && column === 'access' && (
                                                                                <span className="column-badge">
                                                                                     {currentUser.access === 1 ? 'Admin Control' : 'View Only'}
                                                                                </span>
                                                                           )}
                                                                      </th>
                                                                 );
                                                            })}
                                                            <th>Actions</th>
                                                       </tr>
                                                  </thead>
                                                  <tbody>
                                                       {tableData.map((row, index) => (
                                                            <tr key={index}>
                                                                 {Object.entries(row).map(([columnName, value], cellIndex) => {
                                                                      // Hide access column data for users table if user has access > 2
                                                                      if (selectedTable === 'users' && columnName === 'access' && currentUser.access > 2) {
                                                                           return null;
                                                                      }

                                                                      return (
                                                                           <td
                                                                                key={cellIndex}
                                                                                title={value}
                                                                                className={`
                                                                                     ${selectedTable === 'users' && columnName === 'access' ? 'access-cell' : ''}
                                                                                     ${selectedTable === 'users' && columnName === 'premium' ? 'premium-cell' : ''}
                                                                                `}
                                                                           >
                                                                                {/* Special formatting for access column */}
                                                                                {selectedTable === 'users' && columnName === 'access' ? (
                                                                                     <span className={`access-badge ${value === 1 ? 'admin' : value === 2 ? 'moderator' : 'user'}`}>
                                                                                          {value === 1 ? 'Admin' : value === 2 ? 'Moderator' : 'User'}
                                                                                     </span>
                                                                                ) : selectedTable === 'users' && columnName === 'premium' ? (
                                                                                     <span className={`premium-badge ${value === 1 ? 'premium' : 'free'}`}>
                                                                                          {value === 1 ? 'Premium' : 'Free'}
                                                                                     </span>
                                                                                ) : (
                                                                                     formatValue(value)
                                                                                )}
                                                                           </td>
                                                                      );
                                                                 })}
                                                                 <td className="actions-cell">
                                                                      <button
                                                                           className="edit-btn"
                                                                           onClick={() => handleEdit(row, index)}
                                                                      >
                                                                           ✏️
                                                                      </button>
                                                                      <button
                                                                           className="delete-btn"
                                                                           onClick={() => handleDelete(row, index)}
                                                                      >
                                                                           🗑️
                                                                      </button>
                                                                 </td>
                                                            </tr>
                                                       ))}
                                                  </tbody>
                                             </table>
                                        </div>
                                   ) : (
                                        <p className="no-data">No data found in this table</p>
                                   )}
                              </div>
                         </div>
                    )}

                    {/* Edit Modal */}
                    {showEditModal && (
                         <div className="modal-overlay">
                              <div className="modal">
                                   <h3>Edit Row in {selectedTable}</h3>
                                   <div className="modal-content">
                                        {tableStructure.map((field) => (
                                             <div key={field.Field} className="form-group">
                                                  <label>{field.Field} ({field.Type})</label>
                                                  {renderInputField(
                                                       field,
                                                       editFormData[field.Field],
                                                       (fieldName, value) => setEditFormData({ ...editFormData, [fieldName]: value })
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                                   <div className="modal-actions">
                                        <button className="save-btn" onClick={handleSaveEdit}>
                                             Save Changes
                                        </button>
                                        <button className="cancel-btn" onClick={() => setShowEditModal(false)}>
                                             Cancel
                                        </button>
                                   </div>
                              </div>
                         </div>
                    )}

                    {/* Add New Row Modal */}
                    {showAddModal && (
                         <div className="modal-overlay">
                              <div className="modal">
                                   <h3>Add New Row to {selectedTable}</h3>
                                   <div className="modal-content">
                                        {tableStructure.map((field) => (
                                             <div key={field.Field} className="form-group">
                                                  <label>{field.Field} ({field.Type})</label>
                                                  {renderInputField(
                                                       field,
                                                       newRowData[field.Field],
                                                       (fieldName, value) => setNewRowData({ ...newRowData, [fieldName]: value }),
                                                       true
                                                  )}
                                             </div>
                                        ))}
                                   </div>
                                   <div className="modal-actions">
                                        <button className="save-btn" onClick={handleSaveNew}>
                                             Add Row
                                        </button>
                                        <button className="cancel-btn" onClick={() => setShowAddModal(false)}>
                                             Cancel
                                        </button>
                                   </div>
                              </div>
                         </div>
                    )}

                    {/* Add New Column Modal */}
                    {showAddColumnModal && (
                         <div className="modal-overlay">
                              <div className="modal">
                                   <h3>Add New Column to {selectedTable}</h3>
                                   <div className="modal-content">
                                        <div className="form-group">
                                             <label>Column Name *</label>
                                             <input
                                                  type="text"
                                                  value={newColumnData.columnName}
                                                  onChange={(e) => setNewColumnData({ ...newColumnData, columnName: e.target.value })}
                                                  placeholder="Enter column name"
                                                  required
                                             />
                                        </div>

                                        <div className="form-group">
                                             <label>Column Type *</label>
                                             <select
                                                  value={newColumnData.columnType}
                                                  onChange={(e) => setNewColumnData({ ...newColumnData, columnType: e.target.value })}
                                                  required
                                             >
                                                  <option value="VARCHAR(255)">VARCHAR(255)</option>
                                                  <option value="VARCHAR(100)">VARCHAR(100)</option>
                                                  <option value="VARCHAR(50)">VARCHAR(50)</option>
                                                  <option value="TEXT">TEXT</option>
                                                  <option value="LONGTEXT">LONGTEXT</option>
                                                  <option value="INT">INT</option>
                                                  <option value="BIGINT">BIGINT</option>
                                                  <option value="TINYINT(1)">TINYINT(1) - Boolean</option>
                                                  <option value="DECIMAL(10,2)">DECIMAL(10,2)</option>
                                                  <option value="FLOAT">FLOAT</option>
                                                  <option value="DOUBLE">DOUBLE</option>
                                                  <option value="DATE">DATE</option>
                                                  <option value="DATETIME">DATETIME</option>
                                                  <option value="TIMESTAMP">TIMESTAMP</option>
                                                  <option value="TIME">TIME</option>
                                             </select>
                                        </div>

                                        <div className="form-group">
                                             <label>Allow NULL</label>
                                             <select
                                                  value={newColumnData.isNullable}
                                                  onChange={(e) => setNewColumnData({ ...newColumnData, isNullable: e.target.value === 'true' })}
                                             >
                                                  <option value="true">YES</option>
                                                  <option value="false">NO</option>
                                             </select>
                                        </div>

                                        <div className="form-group">
                                             <label>Default Value</label>
                                             <input
                                                  type="text"
                                                  value={newColumnData.defaultValue}
                                                  onChange={(e) => setNewColumnData({ ...newColumnData, defaultValue: e.target.value })}
                                                  placeholder="Enter default value (optional)"
                                             />
                                        </div>

                                        <div className="form-group">
                                             <label>Extra</label>
                                             <select
                                                  value={newColumnData.extra}
                                                  onChange={(e) => setNewColumnData({ ...newColumnData, extra: e.target.value })}
                                             >
                                                  <option value="">None</option>
                                                  <option value="AUTO_INCREMENT">AUTO_INCREMENT</option>
                                                  <option value="ON UPDATE CURRENT_TIMESTAMP">ON UPDATE CURRENT_TIMESTAMP</option>
                                             </select>
                                        </div>
                                   </div>
                                   <div className="modal-actions">
                                        <button className="save-btn" onClick={handleSaveNewColumn}>
                                             Add Column
                                        </button>
                                        <button className="cancel-btn" onClick={() => setShowAddColumnModal(false)}>
                                             Cancel
                                        </button>
                                   </div>
                              </div>
                         </div>
                    )}

                    {/* Upload Movie Modal */}
                    {showUploadMovieModal && (
                         <div className="upload-modal-overlay">
                              <div className="upload-modal">
                                   <AddMovie
                                        onClose={() => setShowUploadMovieModal(false)}
                                        onSuccess={() => {
                                             setShowUploadMovieModal(false);
                                             handleUploadSuccess();
                                        }}
                                   />
                              </div>
                         </div>
                    )}

                    {/* Upload Series Modal */}
                    {showUploadSeriesModal && (
                         <div className="upload-modal-overlay">
                              <div className="upload-modal">
                                   <AddSeries
                                        onClose={() => setShowUploadSeriesModal(false)}
                                        onSuccess={() => {
                                             setShowUploadSeriesModal(false);
                                             handleUploadSuccess();
                                        }}
                                   />
                              </div>
                         </div>
                    )}
               </div>
          </div>
     );
}

export default Admin;
