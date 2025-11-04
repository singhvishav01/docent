import { TransitionManager } from '@/lib/transition/TransitionManager'

describe('TransitionManager', () => {
  let manager: TransitionManager

  beforeEach(() => {
    manager = new TransitionManager()
  })

  test('should enqueue artwork transition', () => {
    manager.enqueue('artwork-1')
    
    expect(manager.getNext()).toBe('artwork-1')
    expect(manager.getCurrent()).toBe(null)
  })

  test('should prioritize most recent scan', () => {
    manager.enqueue('artwork-1')
    manager.enqueue('artwork-2')
    manager.enqueue('artwork-3')
    
    expect(manager.getNext()).toBe('artwork-3')
  })

  test('should process queue and update current artwork', async () => {
    let transitionEvent: any = null
    manager.onTransition((event) => {
      transitionEvent = event
    })

    manager.enqueue('artwork-1')
    await manager.processQueue()

    expect(manager.getCurrent()).toBe('artwork-1')
    expect(manager.getNext()).toBe(null)
    expect(transitionEvent).toMatchObject({
      from: null,
      to: 'artwork-1'
    })
  })

  test('should handle multiple rapid scans correctly', () => {
    manager.enqueue('artwork-1')
    manager.enqueue('artwork-2')
    manager.enqueue('artwork-3')
    
    const status = manager.getQueueStatus()
    expect(status.next).toBe('artwork-3')
    expect(status.queueLength).toBe(1) // Only latest scan is valid
  })

  test('should ignore duplicate artwork scans', () => {
    manager.enqueue('artwork-1')
    manager.processQueue()
    
    // Try to enqueue same artwork
    manager.enqueue('artwork-1')
    
    expect(manager.getNext()).toBe(null)
  })

  test('should clear queue correctly', () => {
    manager.enqueue('artwork-1')
    manager.enqueue('artwork-2')
    
    expect(manager.getNext()).toBe('artwork-2')
    
    manager.clearQueue()
    
    expect(manager.getNext()).toBe(null)
  })
})
