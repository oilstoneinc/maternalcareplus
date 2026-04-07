import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sign In
          </h1>
          <p className="text-gray-600">
            Access your digital antenatal care portal
          </p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <SignIn 
            appearance={{
              elements: {
                formButtonPrimary: 'bg-pink-600 hover:bg-pink-700 normal-case',
                footerActionLink: 'text-pink-600 hover:text-pink-700'
              }
            }}
            redirectUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  )
}
