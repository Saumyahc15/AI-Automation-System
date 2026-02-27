import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Sparkles, Workflow, BarChart3, Zap, ShieldCheck } from 'lucide-react'
import FadeIn from '../components/animations/FadeIn'

const features = [
  {
    title: 'Natural language → workflow',
    icon: <Sparkles size={18} />,
    desc: 'Describe automations in plain English and get a structured, executable workflow plan.',
  },
  {
    title: 'AI‑generated code & integrations',
    icon: <Workflow size={18} />,
    desc: 'For each step, the agent generates code and wires it to Gmail, Drive, Sheets, WhatsApp, GitHub, Telegram and more.',
  },
  {
    title: 'Execution & observability',
    icon: <BarChart3 size={18} />,
    desc: 'Run workflows on email, schedule or file triggers with logs, retries and health indicators.',
  },
  {
    title: 'Secure by default',
    icon: <ShieldCheck size={18} />,
    desc: 'Scoped API keys, OAuth credentials and transparent actions for every workflow.',
  },
]

const currentIntegrations = [
  'Gmail',
  'Google Drive',
  'Google Sheets',
  'GitHub',
  'Telegram',
  'WhatsApp (Cloud API)',
]

const upcomingIntegrations = ['Spotify', 'Canva', 'Google Maps', 'LinkedIn']

const useCases = [
  {
    title: 'Interview pipeline automation',
    desc: "When an email arrives with subject 'Interview Call', save the attachment to Drive, log a row in a hiring Sheet, and send yourself a WhatsApp reminder.",
  },
  {
    title: 'Engineering alerts to chat',
    desc: 'When a GitHub issue is opened with label prod-bug, summarize it and notify a Telegram group, then append the incident to a tracking Sheet.',
  },
  {
    title: 'Automated reporting',
    desc: 'Every Monday at 9am, pull last week’s GitHub activity, inbox highlights and Sheet metrics, then send a single summary message.',
  },
  {
    title: 'Document inbox',
    desc: 'Whenever a PDF invoice hits Gmail, extract fields, append them to a finance Sheet and archive the invoice to Drive.',
  },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950/10 text-white">
      <div className="pointer-events-none fixed inset-0 -z-5">
        <div className="animated-grid absolute inset-0 opacity-15" />
        <div className="bg-orbit absolute -left-16 top-32 h-80 w-80 rounded-full opacity-20 blur-3xl" />
        <div className="bg-orbit absolute -right-24 top-0 h-96 w-96 rounded-full opacity-16 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="flex flex-col gap-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <motion.div
              className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-2 text-sm text-primary ring-1 ring-primary/30"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Sparkles size={16} /> AI agent for workflow automation
            </motion.div>
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-primary/20 via-emerald-400/15 to-purple-500/15 blur-3xl" />
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Turn plain English into <span className="text-primary">live automations</span>.
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-slate-300">
                Describe what you want—like “When I get an interview email, save the attachment to Drive and ping me on WhatsApp.”
                The agent designs the workflow, writes the integration code and runs it for you.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-400 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px]"
              >
                Get Started
              </Link>
              <Link
                to="/app/overview"
                className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
              >
                <Play size={16} /> View Demo
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => (
                <FadeIn key={f.title} delay={0.1 + i * 0.08}>
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ duration: 0.25 }}
                    className="glass glass-gradient rounded-2xl p-4"
                  >
                    <div className="mb-2 flex items-center gap-2 text-primary">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
                        {f.icon}
                      </div>
                      <span className="text-sm font-semibold text-white">{f.title}</span>
                    </div>
                    <p className="text-sm text-slate-400">{f.desc}</p>
                  </motion.div>
                </FadeIn>
              ))}
            </div>
          </motion.div>
        </div>

        {/* About the platform */}
        <div className="mt-10 rounded-3xl bg-white/[0.04] p-6 card-border">
          <h2 className="text-sm font-semibold text-slate-100">What this platform does</h2>
          <p className="mt-2 text-sm text-slate-300">
            This system is an AI agent that turns natural‑language instructions into executable automation workflows. It
            understands your intent, identifies triggers and actions, generates workflow logic and integration code, and
            then executes and monitors the automation with minimal manual setup.
          </p>
          <p className="mt-2 text-sm text-slate-300">
            It currently supports common triggers such as incoming emails, scheduled tasks and file uploads, and
            connects to tools you already use so your data can move automatically between them.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-12 grid gap-4 rounded-3xl bg-white/[0.04] p-6 card-border sm:grid-cols-3">
          {[
            {
              title: '1. Describe your workflow',
              body: 'Type what you want in natural language—no DSLs or YAML. The agent parses intent, triggers and actions.',
            },
            {
              title: '2. AI designs & codes it',
              body: 'We generate a structured workflow plan plus integration code for each step, then validate it before running.',
            },
            {
              title: '3. Run, monitor, refine',
              body: 'Activate the workflow, watch executions in real time, inspect logs and tweak by editing the original instruction.',
            },
          ].map((item, i) => (
            <FadeIn key={item.title} delay={0.1 + i * 0.06}>
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/5"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        {/* Integrations */}
        <div className="mt-10 rounded-3xl bg-white/[0.03] p-6 card-border">
          <div className="mb-3 flex items-center gap-2">
            <Workflow size={18} className="text-primary" />
            <h2 className="text-sm font-semibold text-slate-100">Integrations</h2>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Nova connects your workflows to the tools you already use today, and we are actively adding more
            productivity and creative platforms.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Available now
              </p>
              <div className="flex flex-wrap gap-2">
                {currentIntegrations.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Coming soon
              </p>
              <div className="flex flex-wrap gap-2">
                {upcomingIntegrations.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/30"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Example automations</h2>
            <span className="text-xs text-slate-400">Email, schedules, files and more</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {useCases.map((uc, i) => (
              <FadeIn key={uc.title} delay={0.1 + i * 0.05}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.25 }}
                  className="glass rounded-3xl p-5"
                >
                  <p className="text-sm font-semibold text-white">{uc.title}</p>
                  <p className="mt-2 text-sm text-slate-400">{uc.desc}</p>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-10 rounded-3xl bg-white/[0.04] p-6 card-border">
          <h2 className="text-sm font-semibold text-slate-100">Contact</h2>
          <p className="mt-2 text-sm text-slate-300">
            For collaboration, questions or academic use of this project, you can reach the team at:
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-200">
            <li>
              <span className="font-semibold">Khushi Dadhaniya</span> –{' '}
              <a href="mailto:23DCS017@charusat.edu.in" className="text-primary underline-offset-2 hover:underline">
                23DCS017@charusat.edu.in
              </a>
            </li>
            <li>
              <span className="font-semibold">Saumya Chandwani</span> –{' '}
              <a href="mailto:23DCS014@charusat.edu.in" className="text-primary underline-offset-2 hover:underline">
                23DCS014@charusat.edu.in
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

