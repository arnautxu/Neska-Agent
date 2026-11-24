import { classifyNeskaRisk, neskaReview, NESKA_RISK_REASON } from './neskaRisk';

describe('classifyNeskaRisk', () => {
  it('treats sending, deleting and paying as irreversible', () => {
    expect(classifyNeskaRisk('send_email_mcp_gmail')).toBe('irreversible');
    expect(classifyNeskaRisk('envia_correu_mcp_e2e-memory')).toBe('irreversible');
    expect(classifyNeskaRisk('delete_file_action_drive')).toBe('irreversible');
    expect(classifyNeskaRisk('pay_invoice')).toBe('irreversible');
  });

  it('treats drafting and editing as reversible', () => {
    expect(classifyNeskaRisk('create_draft_mcp_gmail')).toBe('reversible');
    expect(classifyNeskaRisk('update_row_mcp_sheets')).toBe('reversible');
  });

  it('does not let the server name decide the risk', () => {
    expect(classifyNeskaRisk('lookup_mcp_send-server')).toBe('unknown');
  });

  it('falls back to unknown', () => {
    expect(classifyNeskaRisk('lookup_invoice_mcp_cuiner')).toBe('unknown');
  });
});

describe('neskaReview', () => {
  it('offers only approve and reject with the server reason', () => {
    expect(neskaReview('send_email_mcp_gmail')).toEqual({
      reason: NESKA_RISK_REASON.irreversible,
      allowedDecisions: ['approve', 'reject'],
    });
  });
});
