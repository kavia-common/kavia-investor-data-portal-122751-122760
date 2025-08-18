import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { inviteUserAsFounder } from '../../services/inviteFounderService';

/**
 * PUBLIC_INTERFACE
 * AdminUserManagement
 * 
 * Admin panel component to view users (email, role/status) and promote/demote user admin status.
 * Requires backend RPCs:
 *   - list_users_with_metadata: returns [{id, email, roles: [], created_at, confirmed_at, last_sign_in_at}]
 *   - set_user_roles: accepts { user_id, roles: [] }
 *
 * Only visible to admin users. All changes require live reload.
 */
export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState([]); // Array of user ids being updated

  // --- Invitation state/UI ---
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState('');

  // Fetch user list on mount
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    setUsers([]);
    try {
      // Secure SQL function/RPC; must be limited to 'admin' server-side
      const { data, error } = await supabase.rpc('list_users_with_metadata', {});
      if (error || !Array.isArray(data)) {
        throw new Error(error?.message || 'Unable to fetch user list');
      }
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  // Promote or demote user to/from admin (toggle)
  async function handleToggleAdmin(user) {
    setBusyIds((ids) => [...ids, user.id]);
    try {
      const currRoles = Array.isArray(user.roles) ? user.roles : [];
      const isAdmin = currRoles.includes('admin');
      let newRoles;
      if (isAdmin) {
        newRoles = currRoles.filter(r => r !== 'admin');
      } else {
        newRoles = [...currRoles, 'admin'];
      }
      // Secure server-side RPC, only available to actual admins
      const { error } = await supabase.rpc('set_user_roles', { user_id: user.id, roles: newRoles });
      if (error) throw new Error(error.message || 'Could not update roles');
      await fetchUsers();
    } catch (err) {
      alert(`Error updating roles: ${err.message}`);
    } finally {
      setBusyIds((ids) => ids.filter(id => id !== user.id));
    }
  }

  // Promote user to founder
  // PUBLIC_INTERFACE
  async function handlePromoteToFounder(user) {
    setBusyIds(ids => [...ids, user.id]);
    try {
      const currRoles = Array.isArray(user.roles) ? user.roles : [];
      if (currRoles.includes('founder')) {
        setBusyIds(ids => ids.filter(id => id !== user.id));
        return;
      }
      // Use secure Admin API role set if permitted
      const { assignFounderRole } = await import('../../services/inviteFounderService');
      // Only attempt if we have admin privileges (browser must be privileged or running in a secure context)
      let assigned = false;
      if (process.env.REACT_APP_SUPABASE_KEY && process.env.REACT_APP_SUPABASE_KEY.startsWith('sbp')) {
        assigned = await assignFounderRole(user.id, [...currRoles, 'founder'].filter((v, i, arr) => arr.indexOf(v) === i));
      } else {
        // fallback: old RPC
        const newRoles = [...currRoles, 'founder'].filter((v, i, arr) => arr.indexOf(v) === i);
        const { error } = await supabase.rpc('set_user_roles', { user_id: user.id, roles: newRoles });
        if (error) throw new Error(error.message || 'Could not update roles');
        assigned = true;
      }
      if (assigned) await fetchUsers();
      else throw new Error("Failed to assign founder role via Admin API.");
    } catch (err) {
      alert(`Error promoting user to founder: ${err.message}`);
    } finally {
      setBusyIds(ids => ids.filter(id => id !== user.id));
    }
  }

  // Helper to show relative date nicely
  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleString();
  }

  return (
    <section
      aria-label="Admin - User Management"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        padding: '1rem',
        marginBottom: 16,
        marginTop: 12,
        display: 'grid',
        gap: 14,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>User Management</h2>
        <button
          type="button"
          style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 10px', borderRadius: 6 }}
          onClick={fetchUsers}
          disabled={loading}
        >
          Reload Users
        </button>
      </header>

      {/* Invite Founder UI */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setInviting(true);
          setInviteResult('');
          try {
            const siteUrl = process.env.REACT_APP_SITE_URL || window.location.origin;
            const result = await inviteUserAsFounder(inviteEmail, siteUrl);
            if (result.success) {
              setInviteResult('Invitation sent! Founder will receive a magic link email.');
              setInviteEmail('');
              fetchUsers();
            } else {
              setInviteResult(result.error || 'Failed to invite.');
            }
          } catch (err) {
            setInviteResult('Error: ' + (err.message || err));
          }
          setInviting(false);
        }}
        style={{
          margin: '10px 0 5px 0',
          background: 'rgba(255,255,204,0.12)',
          border: '1px solid #FFD70033',
          borderRadius: 9,
          padding: '9px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          maxWidth: 500,
        }}
      >
        <input
          type="email"
          required
          autoComplete="off"
          placeholder="Invite new founder by email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          disabled={inviting}
          style={{
            fontSize: 14,
            border: '1px solid #FFD700',
            borderRadius: 6,
            padding: '5px 10px',
            flex: 1,
          }}
        />
        <button
          type="submit"
          style={{
            background: inviting ? '#FFD70055' : '#FFD700',
            color: '#282C34',
            border: 'none',
            borderRadius: 7,
            padding: '6px 14px',
            fontWeight: 700,
            fontSize: 13,
            minWidth: 90,
            cursor: inviting ? 'not-allowed' : 'pointer'
          }}
          disabled={inviting}
        >
          {inviting ? 'Inviting...' : 'Invite Founder'}
        </button>
      </form>
      {inviteResult && (
        <div style={{ color: /success|sent/i.test(inviteResult) ? '#059669' : '#B91C1C', margin: '3px 0 12px 0', fontSize: 13 }}>
          {inviteResult}
        </div>
      )}
      {error && (
        <div style={{ color: '#dc3545', fontWeight: 500 }}>{error}</div>
      )}
      <div style={{ overflow: 'auto', borderRadius: 10 }}>
        <table
          style={{
            width: '100%',
            background: 'transparent',
            borderCollapse: 'collapse',
            minWidth: 400,
          }}
        >
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ textAlign: 'left', fontSize: 13, fontWeight: 700, padding: '7px 10px' }}>Email</th>
              <th style={{ textAlign: 'left', fontSize: 13, fontWeight: 700, padding: '7px 10px' }}>Roles</th>
              <th style={{ textAlign: 'left', fontSize: 13, fontWeight: 700, padding: '7px 10px' }}>Status</th>
              <th style={{ textAlign: 'left', fontSize: 13, fontWeight: 700, padding: '7px 10px' }}>Joined</th>
              <th style={{ textAlign: 'left', fontSize: 13, fontWeight: 700, padding: '7px 10px' }}>Last Sign-in</th>
              <th style={{ padding: '7px 10px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 18, color: 'var(--text-secondary)' }}>
                  Loading user list...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 18, color: 'var(--text-secondary)' }}>
                  No users found. Ensure the backend RPC exists and you have admin privileges.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '6px 10px', fontSize: 14 }}>{user.email || <span style={{ color: '#888' }}>Unnamed</span>}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>
                    {Array.isArray(user.roles) && user.roles.length > 0
                      ? user.roles.map(r => (
                          <span
                            key={r}
                            style={{
                              fontSize: 12,
                              padding: '2px 7px',
                              borderRadius: 99,
                              background: r === 'admin' ? '#e0ecff' : (r === 'founder' ? '#fff5c2' : '#f6f6fa'),
                              color: r === 'admin' ? '#0057B8' : (r === 'founder' ? '#B88C00' : '#222'),
                              fontWeight: r === 'admin' || r === 'founder' ? 700 : 500,
                              marginRight: 4,
                              border: r === 'admin'
                                ? '1px solid #0057B8'
                                : (r === 'founder' ? '1px solid #FFD700' : '1px solid #bbb'),
                            }}
                          >
                            {r}
                          </span>
                        ))
                      : <span style={{ color: '#aaa' }}>none</span>
                    }
                  </td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{user.confirmed_at ? 'Confirmed' : 'Unconfirmed'}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{fmtDate(user.created_at)}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13 }}>{fmtDate(user.last_sign_in_at)}</td>
                  <td style={{ padding: '6px 10px', fontSize: 13, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      style={{
                        fontSize: 13,
                        padding: '6px 12px',
                        borderRadius: 7,
                        background: user.roles.includes('admin') ? '#FFD700' : '#0057B8',
                        color: user.roles.includes('admin') ? '#282C34' : '#fff',
                        border: 'none',
                        cursor: busyIds.includes(user.id) ? 'wait' : 'pointer',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                        fontWeight: 700,
                        opacity: busyIds.includes(user.id) ? 0.7 : 1,
                        marginRight: 0
                      }}
                      disabled={busyIds.includes(user.id)}
                      onClick={() => handleToggleAdmin(user)}
                      title={user.roles.includes('admin') ? 'Demote from admin' : 'Promote to admin'}
                    >
                      {busyIds.includes(user.id)
                        ? 'Updating...'
                        : user.roles.includes('admin')
                          ? 'Demote Admin'
                          : 'Promote to Admin'}
                    </button>
                    <button
                      type="button"
                      style={{
                        fontSize: 13,
                        padding: '6px 12px',
                        borderRadius: 7,
                        background: user.roles.includes('founder') ? '#fff5c2' : '#FFA826',
                        color: user.roles.includes('founder') ? '#B88C00' : '#fff',
                        border: user.roles.includes('founder') ? '1px solid #FFD700' : 'none',
                        fontWeight: 700,
                        cursor: busyIds.includes(user.id) ? 'wait' : 'pointer',
                        opacity: busyIds.includes(user.id) ? 0.7 : 1,
                      }}
                      disabled={busyIds.includes(user.id)}
                      onClick={() => handlePromoteToFounder(user)}
                      title={user.roles.includes('founder') 
                        ? 'User is already a Founder'
                        : 'Promote to Founder (grants full platform permissions)'}
                    >
                      {busyIds.includes(user.id)
                        ? 'Updating...'
                        : user.roles.includes('founder')
                          ? 'Founder'
                          : 'Promote to Founder'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        <strong>Note:</strong> If you do not see any users, ensure that the required Supabase RPC is deployed and Row-Level Security grants this access only to actual admin users. You can promote users to <b>founder</b> or <b>admin</b> — these roles have special document permissions and security consequences. Changes take effect immediately and may log out users automatically if their role is modified.
      </div>
    </section>
  );
}
