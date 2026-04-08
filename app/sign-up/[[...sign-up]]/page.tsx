'use client'

import { useState } from 'react'
import { useSignUp } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const isLoaded = fetchStatus === 'idle' && !!signUp
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !signUp) return

    setLoading(true)
    setError('')

    try {
      await signUp.password({
        emailAddress: email,
        password,
        firstName,
        lastName,
      })

      if (signUp.status === 'complete') {
        // Update user metadata with role and additional info
        await signUp.update({
          unsafeMetadata: {
            role,
            phone,
          },
        })

        await signUp.finalize({
          navigate: (opts: any) => {
            const { decorateUrl } = opts;
            const targetUrl = decorateUrl ? decorateUrl('/dashboard') : '/dashboard';
            router.push(targetUrl);
          },
        })
      } else {
        // Handle incomplete sign up
        console.log('Sign up incomplete')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'An error occurred during sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Account
          </h1>
          <p className="text-muted-foreground">
            Join our digital antenatal care platform
          </p>
        </div>
        
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                />
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233XXXXXXXXX"
                title="Phone Number"
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-foreground mb-2">
                I am a...
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                title="Select your role"
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              >
                <option value="">Select your role</option>
                <option value="pregnant_woman">Pregnant Woman</option>
                <option value="father">Father/Partner</option>
                <option value="midwife">Midwife</option>
                <option value="hospital_staff">Hospital Staff</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isLoaded}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <a href="/sign-in" className="text-primary hover:text-primary/80 font-medium">
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
