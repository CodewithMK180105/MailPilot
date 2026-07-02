import { Injectable, BadRequestException } from '@nestjs/common';
import * as Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  private readonly VARIABLE_REGEX = /\{\{(\w+)\}\}/g;

  /**
   * Compiles a Handlebars template string into a template delegate
   */
  compile(template: string): Handlebars.TemplateDelegate {
    try {
      return Handlebars.compile(template);
    } catch (err) {
      throw new BadRequestException(`Invalid template syntax: ${String(err)}`);
    }
  }

  /**
   * Renders a Handlebars template with provided data
   */
  render(template: string, data: Record<string, unknown>): string {
    try {
      const compiled = this.compile(template);
      const rendered = compiled(data);
      return this.wrapInHtmlEmail(rendered);
    } catch (err) {
      throw new BadRequestException(`Template rendering failed: ${String(err)}`);
    }
  }

  /**
   * Renders without HTML wrapping (for subject lines)
   */
  renderRaw(template: string, data: Record<string, unknown>): string {
    const compiled = this.compile(template);
    return compiled(data);
  }

  /**
   * Extracts all {{variable}} names from a template string
   */
  extractVariables(template: string): string[] {
    const variables = new Set<string>();
    const regex = new RegExp(this.VARIABLE_REGEX.source, 'g');
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }
    return Array.from(variables);
  }

  /**
   * Validates that all template variables are present in the provided columns
   */
  validate(
    template: string,
    columns: string[],
  ): { isValid: boolean; missing: string[] } {
    const variables = this.extractVariables(template);
    const normalizedColumns = columns.map((c) => c.toLowerCase().trim());

    const missing = variables.filter(
      (v) => !normalizedColumns.includes(v.toLowerCase().trim()),
    );

    return {
      isValid: missing.length === 0,
      missing,
    };
  }

  /**
   * Wraps plain text or partial HTML into a responsive email-safe HTML template
   * Converts newlines to <br> and applies inline CSS for email clients
   */
  private wrapInHtmlEmail(content: string): string {
    // Convert newlines to <br> if content doesn't look like HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    const body = isHtml ? content : content.replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <div style="font-size: 16px; line-height: 1.6; color: #333333;">
                ${body}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
