import { QRLocationProvider } from '@/lib/location/QRLocationProvider'

// Mock browser APIs
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn()
  }
})

describe('QRLocationProvider', () => {
  let provider: QRLocationProvider

  beforeEach(() => {
    provider = new QRLocationProvider()
  })

  afterEach(() => {
    provider.cleanup()
  })

  test('should initialize without errors', async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }]
    }
    
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream)
    
    await expect(provider.initialize()).resolves.not.toThrow()
  })

  test('should handle camera permission denial', async () => {
    const permissionError = new Error('Permission denied')
    permissionError.name = 'NotAllowedError'
    
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(permissionError)
    
    await expect(provider.initialize()).rejects.toThrow()
  })

  test('should cleanup resources properly', () => {
    expect(() => provider.cleanup()).not.toThrow()
  })
})