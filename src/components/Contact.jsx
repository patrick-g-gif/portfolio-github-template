import { motion } from 'framer-motion'
import { Section } from './Section.jsx'
import { contact } from '../data/portfolio.js'
import { usePrefersReducedMotion } from '../hooks/useMedia.js'

const SOCIAL_ICONS = {
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" />
      <path d="m4 7.5 8 5.5 8-5.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.4" />
      <path d="M8 10.5V16.5M8 7.6v.1M11.6 16.5v-3.4a2 2 0 0 1 4 0v3.4" strokeLinecap="round" />
    </>
  ),
  github: (
    <>
      <path
        d="M9 19.5c-4 1.2-4-2.2-5.6-2.6m11.2 5.1v-3.3a2.9 2.9 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-5.9a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.3 3.8 5.3 4.1 5.3 4.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.9 10.5c0 4.6 2.8 5.6 5.5 5.9a2.9 2.9 0 0 0-.8 2.2V22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  whatsapp: (
    <path
      d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.2A8.5 8.5 0 1 0 12 3.5Zm0 1.6a6.9 6.9 0 0 1 5.9 10.5 6.9 6.9 0 0 1-9.9 2.3l-.3-.2-2.5.7.7-2.4-.2-.3A6.9 6.9 0 0 1 12 5.1Zm-2.9 3.4c-.2 0-.4 0-.6.4-.2.3-.7.8-.7 1.9s.7 2.1.8 2.3c.1.1 1.4 2.3 3.6 3.1 1.8.7 2.1.6 2.5.5.4 0 1.3-.5 1.5-1 .2-.5.2-.9.1-1l-.5-.3c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1l-.6.8c-.1.1-.2.2-.4.1a5.6 5.6 0 0 1-1.7-1 6.3 6.3 0 0 1-1.1-1.4c-.1-.2 0-.3.1-.4l.3-.4.2-.3c.1-.1 0-.3 0-.4l-.7-1.6c-.2-.4-.3-.3-.5-.3Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
}

const SOCIAL_META = {
  mail: { label: 'Email', value: contact.email, primary: true },
  github: { label: 'GitHub', value: contact.github.replace(/^https?:\/\//, ''), primary: false },
  whatsapp: { label: 'WhatsApp', value: 'chat di WhatsApp', primary: false },
}

export function Contact() {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Section
      id="contact"
      index={7}
      title="Contact"
    >
      <ul className="grid gap-3 sm:grid-cols-3">
        {contact.socials.map((social, index) => {
          const meta = SOCIAL_META[social.icon] ?? { label: social.label, value: social.url, primary: false }
          return (
            <motion.li
              key={social.id}
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : index * 0.06 }}
            >
              <a
                href={social.url}
                target={social.icon === 'mail' ? undefined : '_blank'}
                rel={social.icon === 'mail' ? undefined : 'noreferrer noopener'}
                className="panel flex h-full flex-col gap-2 p-4 transition-colors hover:border-cyan-400/50"
              >
                <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    {SOCIAL_ICONS[social.icon]}
                  </svg>
                  {meta.label}
                </span>
                <span className="break-all font-mono text-xs text-slate-600 dark:text-slate-400">{meta.value}</span>
              </a>
            </motion.li>
          )
        })}
      </ul>
    </Section>
  )
}

export default Contact
