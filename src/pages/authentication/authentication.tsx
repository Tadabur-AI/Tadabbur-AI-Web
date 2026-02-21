import AuthLayout from '../../layouts/AuthLayout';

export default function AuthenticationPage() {
  return (
    <AuthLayout
      leftContent={
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-primary">Welcome Back</h1>
          <p className="text-lg text-text-muted">Sign in to continue</p>
        </div>
      }
      rightContent={
        <div className="w-full max-w-[400px]">
          <form className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text">
                Email address
              </label>
              <input
                type="email"
                id="email"
                className="mt-1 block w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-surface text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="mt-1 block w-full px-3 py-2 border border-border rounded-lg shadow-sm bg-surface text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-on-primary py-2 px-4 rounded-lg border-none cursor-pointer hover:bg-primary-hover transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      }
    />
  );
}
