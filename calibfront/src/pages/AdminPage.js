import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from '../components/auth/PrivateRoute';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserManagement from '../components/admin/UserManagement';
import GroupManagement from '../components/admin/GroupManagement';
import NotificationManagement from '../components/admin/NotificationManagement';
import ActionHistory from '../components/admin/ActionHistory';

const AdminPage = () => {
    return (
        <div className="container mt-4">
            <h2>Административная панель</h2>
            <div className="row">
                <div className="col-md-3">
                    <div className="list-group">
                        <a href="/admin" className="list-group-item list-group-item-action">Дашборд</a>
                        <a href="/admin/users" className="list-group-item list-group-item-action">Пользователи</a>
                        <a href="/admin/groups" className="list-group-item list-group-item-action">Группы</a>
                        <a href="/admin/notifications" className="list-group-item list-group-item-action">Уведомления</a>
                        <a href="/admin/history" className="list-group-item list-group-item-action">История действий</a>
                    </div>
                </div>
                <div className="col-md-9">
                    <Routes>
                        <Route path="/" element={
                            <PrivateRoute>
                                <AdminDashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/users" element={
                            <PrivateRoute requiredPermissions={['admins']}>
                                <UserManagement />
                            </PrivateRoute>
                        } />
                        <Route path="/groups" element={
                            <PrivateRoute requiredPermissions={['admins']}>
                                <GroupManagement />
                            </PrivateRoute>
                        } />
                        <Route path="/notifications" element={
                            <PrivateRoute>
                                <NotificationManagement />
                            </PrivateRoute>
                        } />
                        <Route path="/history" element={
                            <PrivateRoute requiredPermissions={['admins']}>
                                <ActionHistory />
                            </PrivateRoute>
                        } />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
