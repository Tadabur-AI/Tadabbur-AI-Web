import AuthLayout from '../../layouts/AuthLayout';

export default function AuthenticationPage() {
  return (
    <AuthLayout
      leftContent={
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Welcome Back</h1>
          <p style={{ fontSize: '1rem' }}>Sign in to continue</p>
        </div>
      }
      rightContent={
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500' }}>
                Email address
              </label>
              <input
                type="email"
                id="email"
                style={{
                  marginTop: '0.25rem',
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              />
            </div>
            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500' }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                style={{
                  marginTop: '0.25rem',
                  display: 'block',
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: '#000',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </form>
        </div>
      }
    />
  );
}