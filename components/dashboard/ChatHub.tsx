'use client'

import React, { useState, useEffect, useRef } from 'react'
import { pusherClient } from '@/lib/pusher-client'
import { sendMessage, getMessages } from '@/app/actions'
import { Message } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, Loader2 } from 'lucide-react'

interface ChatHubProps {
  currentUserId: string
  otherUserId: string
  otherUserName: string
  pregnancyId?: string
}

export default function ChatHub({ currentUserId, otherUserId, otherUserName, pregnancyId }: ChatHubProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch initial messages
    const fetchMessages = async () => {
      const msgs = await getMessages(otherUserId)
      setMessages(msgs as any)
      setIsLoading(false)
    }
    fetchMessages()

    // Subscribe to pusher channel
    const channel = pusherClient.subscribe(`chat-${currentUserId}`)
    channel.bind('new-message', (data: Message) => {
      if (data.senderId === otherUserId || data.senderId === currentUserId) {
        setMessages((prev) => [...prev, data])
      }
    })

    return () => {
      pusherClient.unsubscribe(`chat-${currentUserId}`)
    }
  }, [currentUserId, otherUserId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await sendMessage(otherUserId, newMessage, pregnancyId)
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    )
  }

  return (
    <Card className="w-full h-[600px] flex flex-col shadow-lg border-none bg-white/80 backdrop-blur-md">
      <CardHeader className="border-b bg-secondary/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {otherUserName[0]}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-lg font-bold">{otherUserName}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 overflow-hidden">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderId === currentUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.senderId === currentUserId
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-muted text-gray-800 rounded-tl-none'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span className="text-[10px] opacity-70 mt-1 block">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="rounded-full bg-white border-muted focus-visible:ring-primary"
            disabled={isSending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="rounded-full btn-pink shadow-md"
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
