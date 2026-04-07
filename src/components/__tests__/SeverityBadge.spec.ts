import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SeverityBadge from '@/components/SeverityBadge.vue'

// PrimeVue Tag stubs
const TagStub = {
  name: 'Tag',
  props: ['value', 'severity'],
  template: '<span :class="`tag-${severity}`">{{ value }}</span>',
}

describe('SeverityBadge', () => {
  it('renders BLOCKING label', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'BLOCKING' },
      global: { components: { Tag: TagStub } },
    })
    expect(wrapper.text()).toContain('BLOCKING')
  })

  it('renders WARNING label', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'WARNING' },
      global: { components: { Tag: TagStub } },
    })
    expect(wrapper.text()).toContain('WARNING')
  })

  it('renders INFO label', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'INFO' },
      global: { components: { Tag: TagStub } },
    })
    expect(wrapper.text()).toContain('INFO')
  })

  it('maps BLOCKING → danger severity', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'BLOCKING' },
      global: { components: { Tag: TagStub } },
    })
    expect(wrapper.find('[class*="danger"]').exists()).toBe(true)
  })

  it('maps WARNING → warn severity', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'WARNING' },
      global: { components: { Tag: TagStub } },
    })
    expect(wrapper.find('[class*="warn"]').exists()).toBe(true)
  })

  it('maps INFO → info severity', () => {
    const wrapper = mount(SeverityBadge, {
      props: { severity: 'INFO' },
      global: { components: { Tag: TagStub } },
    })
    expect(wrapper.find('[class*="info"]').exists()).toBe(true)
  })
})
