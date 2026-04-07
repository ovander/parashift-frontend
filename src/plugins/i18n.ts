import { createI18n } from 'vue-i18n'

const messages = {
  fr: {
    common: {
      save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer',
      edit: 'Modifier', add: 'Ajouter', create: 'Créer', close: 'Fermer',
      confirm: 'Confirmer', loading: 'Chargement...', noData: 'Aucune donnée',
      actions: 'Actions', search: 'Rechercher', back: 'Retour',
      publish: 'Publier', retry: 'Réessayer',
    },
    nav: {
      planner: 'Planificateur', myWeek: 'Ma semaine', rules: 'Règles',
      coverage: 'Couverture', templates: 'Modèles', leave: 'Congés',
      swaps: 'Échanges', admin: 'Administration', config: 'Configuration',
    },
    auth: {
      login: 'Connexion', logout: 'Déconnexion',
      loginTitle: 'Bienvenue sur ParaShift',
      loginSubtitle: 'Connectez-vous pour gérer vos plannings',
      loginButton: 'Se connecter',
    },
    schedule: {
      assign: 'Affecter', unassign: 'Désaffecter',
      unassigned: 'Non affecté', week: 'Semaine',
      schemeA: 'Planning A', schemeB: 'Planning B',
      noShifts: 'Aucun quart de travail cette semaine',
      dragHint: 'Glissez un quart sur un employé pour l\'affecter',
      downloadPdf: 'Télécharger mon planning',
      monthlySchedule: 'Planning mensuel',
      selectMonth: 'Mois',
      print: 'Imprimer / PDF',
      generatedOn: 'Généré le',
      exportCalendar: 'Exporter vers agenda',
    },
    rules: {
      title: 'Règles de planification', new: 'Nouvelle règle',
      type: 'Type', severity: 'Sévérité', description: 'Description',
      enabled: 'Activée', blocking: 'Bloquante', warning: 'Avertissement',
      info: 'Information', maxHours: 'Heures max', minRest: 'Repos min',
      coverage: 'Couverture', roleMatch: 'Correspondance rôle',
    },
    ai: {
      suggest: 'Suggestions IA', optimize: 'Optimiser', insights: 'Insights',
      getSuggestions: 'Obtenir des suggestions', applying: 'Application...',
      confidence: 'Confiance', reason: 'Raison', applyAll: 'Tout appliquer',
      noInsights: 'Aucun insight disponible', dismiss: 'Ignorer',
    },
    leave: {
      title: 'Demandes de congé', request: 'Demander un congé',
      annual: 'Congé annuel', sick: 'Maladie', unpaid: 'Non rémunéré',
      pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé',
      cancel: 'Annuler la demande',
    },
    swap: {
      title: 'Échanges de quarts', request: 'Demander un échange',
      incoming: 'Demandes reçues', accept: 'Accepter', decline: 'Refuser',
    },
  },
  en: {
    common: {
      save: 'Save', cancel: 'Cancel', delete: 'Delete',
      edit: 'Edit', add: 'Add', create: 'Create', close: 'Close',
      confirm: 'Confirm', loading: 'Loading...', noData: 'No data',
      actions: 'Actions', search: 'Search', back: 'Back',
      publish: 'Publish', retry: 'Retry',
    },
    nav: {
      planner: 'Planner', myWeek: 'My Week', rules: 'Rules',
      coverage: 'Coverage', templates: 'Templates', leave: 'Leave',
      swaps: 'Swaps', admin: 'Administration', config: 'Configuration',
    },
    auth: {
      login: 'Login', logout: 'Logout',
      loginTitle: 'Welcome to ParaShift',
      loginSubtitle: 'Sign in to manage your schedules',
      loginButton: 'Sign in',
    },
    schedule: {
      assign: 'Assign', unassign: 'Unassign',
      unassigned: 'Unassigned', week: 'Week',
      schemeA: 'Schedule A', schemeB: 'Schedule B',
      noShifts: 'No shifts this week',
      dragHint: 'Drag a shift onto an employee to assign them',
      downloadPdf: 'Download my schedule',
      monthlySchedule: 'Monthly Schedule',
      selectMonth: 'Month',
      print: 'Print / PDF',
      generatedOn: 'Generated on',
      exportCalendar: 'Export to calendar',
    },
    rules: {
      title: 'Scheduling Rules', new: 'New Rule',
      type: 'Type', severity: 'Severity', description: 'Description',
      enabled: 'Enabled', blocking: 'Blocking', warning: 'Warning',
      info: 'Info', maxHours: 'Max hours', minRest: 'Min rest',
      coverage: 'Coverage', roleMatch: 'Role match',
    },
    ai: {
      suggest: 'AI Suggestions', optimize: 'Optimize', insights: 'Insights',
      getSuggestions: 'Get suggestions', applying: 'Applying...',
      confidence: 'Confidence', reason: 'Reason', applyAll: 'Apply all',
      noInsights: 'No insights available', dismiss: 'Dismiss',
    },
    leave: {
      title: 'Leave Requests', request: 'Request Leave',
      annual: 'Annual Leave', sick: 'Sick Leave', unpaid: 'Unpaid Leave',
      pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
      cancel: 'Cancel Request',
    },
    swap: {
      title: 'Shift Swaps', request: 'Request Swap',
      incoming: 'Incoming Requests', accept: 'Accept', decline: 'Decline',
    },
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: import.meta.env.VITE_DEFAULT_LOCALE || 'en',
  fallbackLocale: 'en',
  messages,
})
