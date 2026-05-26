import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
          background: 'linear-gradient(135deg, #D48BA1 0%, #e6a8bc 100%)',
        }}
      >
        <svg width="96" height="96" viewBox="0 0 24 24" fill="white">
          <path d="M12 4c-2.5 0-4.5 2-4.5 4.5 0 3.5 4.5 8 4.5 8s4.5-4.5 4.5-8C16.5 6 14.5 4 12 4zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
          <path d="M8 17c-.5 1.5 1 4 3s4.5-1.5 4-3H8z" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
