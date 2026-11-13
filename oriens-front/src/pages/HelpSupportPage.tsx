import { useState, useMemo } from "react"
import { PageHeader } from "@/components/common/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  BookOpen,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  Video,
  Youtube,
  Search,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"
import apiClient from "@/services/api"

const faqItems = [
  {
    question: "Como criar um novo projeto?",
    answer: "Para criar um novo projeto, acesse a seção 'Projetos' no menu lateral e clique no botão '+'. Preencha as informações necessárias como título, descrição e cor do projeto."
  },
  {
    question: "Como gerenciar minhas tarefas?",
    answer: "Suas tarefas podem ser gerenciadas na página inicial. Você pode criar novas tarefas, marcar como concluídas, editar detalhes e organizá-las por projeto ou prioridade."
  },
  {
    question: "Como funciona o sistema de notificações?",
    answer: "O Oriens envia notificações para lembrá-lo de tarefas próximas do prazo, atualizações em projetos compartilhados e mensagens de equipe. Você pode personalizar suas preferências de notificação nas configurações."
  },
  {
    question: "Poderei compartilhar projetos com outras pessoas?",
    answer: "Ainda não. O compartilhamento está planejado e chega em uma próxima versão.",
    badge: "Em breve"
  },
  {
    question: "Como acompanhar meu progresso?",
    answer: "Acesse a seção 'Estatísticas' para ver dados detalhados sobre sua produtividade, conclusão de tarefas e progresso dos projetos ao longo do tempo."
  }
]

const videoTutorials = [
  {
    title: "Introdução ao Oriens",
    description: "Aprenda os conceitos básicos e comece a usar o Oriens",
    url: "https://youtube.com/tutorial1",
    duration: "5:30"
  },
  {
    title: "Gerenciamento Avançado de Projetos",
    description: "Técnicas avançadas para organizar seus projetos",
    url: "https://youtube.com/tutorial2",
    duration: "8:45"
  },
  {
    title: "Colaboração em Equipe",
    description: "Como trabalhar eficientemente com sua equipe",
    url: "https://youtube.com/tutorial3",
    duration: "6:15"
  }
]

export default function HelpSupportPage() {
  const { userId, userEmail } = useAuth()
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({})
  const [submitError, setSubmitError] = useState("")

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault()

    const nextErrors: { subject?: string; message?: string } = {}
    if (!subject.trim()) {
      nextErrors.subject = "Informe o assunto."
    }
    if (!message.trim()) {
      nextErrors.message = "Descreva a sua dúvida."
    }
    setErrors(nextErrors)
    setSubmitError("")

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    try {
      await apiClient.post(`/support/user/${userId}/ticket`, {
        subject: subject.trim(),
        message: message.trim()
      })

      toast.success("Solicitação de suporte enviada com sucesso!")
      setSubject("")
      setMessage("")
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error)
      setSubmitError("Não foi possível enviar sua solicitação. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredFaqItems = useMemo(() => {
    if (!searchQuery.trim()) return faqItems
    const query = searchQuery.toLowerCase()
    return faqItems.filter(
      item =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handleOpenVideo = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    toast.success("Abrindo vídeo tutorial...")
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("luisgosampaiowork@gmail.com")
      setCopiedEmail(true)
      toast.success("Email copiado para área de transferência!")
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch (error) {
      toast.error("Erro ao copiar email")
    }
  }

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText("+5581999657655")
      setCopiedPhone(true)
      toast.success("Telefone copiado para área de transferência!")
      setTimeout(() => setCopiedPhone(false), 2000)
    } catch (error) {
      toast.error("Erro ao copiar telefone")
    }
  }

  const handleOpenDocs = (type: 'quick' | 'full') => {
    const urls = {
      quick: 'https://docs.oriens.app/quick-start',
      full: 'https://docs.oriens.app/manual'
    }

    toast.info(`Funcionalidade de documentação em desenvolvimento`)
    // window.open(urls[type], '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex max-w-[1280px] flex-col gap-6 transition-colors">
        <PageHeader
          title="Ajuda & Suporte"
          description="Encontre ajuda, tutoriais e entre em contato com nossa equipe"
        />

        <Separator />

        <Tabs defaultValue="faq" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted">
                <TabsTrigger value="faq" className="data-[state=active]:bg-background">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  FAQ
                </TabsTrigger>
                <TabsTrigger value="tutorials">
                  <Video className="h-4 w-4 mr-2" />
                  Tutoriais
                </TabsTrigger>
                <TabsTrigger value="docs">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Documentação
                </TabsTrigger>
                <TabsTrigger value="contact">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contato
                </TabsTrigger>
              </TabsList>

              <TabsContent value="faq" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Perguntas Frequentes</CardTitle>
                    <CardDescription>
                      Encontre respostas para as dúvidas mais comuns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar nas perguntas frequentes..."
                        aria-label="Buscar nas perguntas frequentes"
                        aria-controls="faq-list"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {filteredFaqItems.length > 0 ? (
                      <Accordion
                        type="single"
                        collapsible
                        id="faq-list"
                        className="w-full"
                      >
                        {filteredFaqItems.map((item, index) => (
                          <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger>
                              <span className="flex flex-wrap items-center gap-2">
                                {item.question}
                                {item.badge && (
                                  <Badge variant="warning">{item.badge}</Badge>
                                )}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent>{item.answer}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma pergunta encontrada para "{searchQuery}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tutorials" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vídeos Tutoriais</CardTitle>
                    <CardDescription>
                      Aprenda a usar o Oriens com nossos vídeos explicativos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {videoTutorials.map((video, index) => (
                        <Card key={index}>
                          <CardHeader className="p-4">
                            <CardTitle className="text-lg">{video.title}</CardTitle>
                            <CardDescription>{video.description}</CardDescription>
                          </CardHeader>
                          <CardFooter className="p-4 pt-0">
                            <Button
                              variant="secondary"
                              className="w-full"
                              onClick={() => handleOpenVideo(video.url)}
                            >
                              <Youtube className="h-4 w-4 mr-2" />
                              Assistir ({video.duration})
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="docs" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Documentação</CardTitle>
                    <CardDescription>
                      Explore nossa documentação detalhada
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Guia de Início Rápido</CardTitle>
                          <CardDescription>
                            Aprenda o básico para começar a usar o Oriens
                          </CardDescription>
                        </CardHeader>
                        <CardFooter>
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenDocs('quick')}
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            Ler Guia
                          </Button>
                        </CardFooter>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Manual Completo</CardTitle>
                          <CardDescription>
                            Documentação detalhada de todas as funcionalidades
                          </CardDescription>
                        </CardHeader>
                        <CardFooter>
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenDocs('full')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Acessar Manual
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contact" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Entre em Contato</CardTitle>
                    <CardDescription>
                      Precisa de ajuda? Nossa equipe está pronta para te atender
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                              <div className="flex items-center">
                                <Mail className="h-5 w-5 mr-2" />
                                Email
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyEmail}
                              >
                                {copiedEmail ? (
                                  <Check className="h-4 w-4 text-positive" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </CardTitle>
                            <CardDescription>
                              luisgosampaiowork@gmail.com
                            </CardDescription>
                          </CardHeader>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center justify-between">
                              <div className="flex items-center">
                                <Phone className="h-5 w-5 mr-2" />
                                Telefone
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyPhone}
                              >
                                {copiedPhone ? (
                                  <Check className="h-4 w-4 text-positive" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </CardTitle>
                            <CardDescription>
                              +55 (81) 99965-7655
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      </div>

                      <form
                        onSubmit={handleSubmitSupport}
                        className="flex flex-col gap-4"
                        noValidate
                      >
                        <Field>
                          <FieldLabel htmlFor="email">Seu e-mail</FieldLabel>
                          <Input
                            id="email"
                            value={userEmail || ""}
                            disabled
                          />
                          <FieldDescription>
                            Usamos este e-mail para responder.
                          </FieldDescription>
                        </Field>

                        <Field data-invalid={Boolean(errors.subject)}>
                          <FieldLabel htmlFor="subject">Assunto</FieldLabel>
                          <Input
                            id="subject"
                            placeholder="Ex: Dúvida sobre criação de projetos"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(errors.subject)}
                            aria-describedby={
                              errors.subject ? "subject-error" : undefined
                            }
                          />
                          {errors.subject && (
                            <FieldError id="subject-error">
                              {errors.subject}
                            </FieldError>
                          )}
                        </Field>

                        <Field data-invalid={Boolean(errors.message)}>
                          <FieldLabel htmlFor="message">Mensagem</FieldLabel>
                          <Textarea
                            id="message"
                            placeholder="Descreva sua dúvida ou problema em detalhes..."
                            className="min-h-[150px]"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={isSubmitting}
                            aria-invalid={Boolean(errors.message)}
                            aria-describedby={
                              errors.message ? "message-error" : undefined
                            }
                          />
                          {errors.message && (
                            <FieldError id="message-error">
                              {errors.message}
                            </FieldError>
                          )}
                        </Field>

                        {submitError && (
                          <FieldError id="submit-error">{submitError}</FieldError>
                        )}

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}