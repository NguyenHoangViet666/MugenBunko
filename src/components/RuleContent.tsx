import type { Rule } from '../types';

// Public reading and admin preview deliberately share the same plain-text renderer.
export default function RuleContent({ rule, number, preview = false }: { rule: Pick<Rule, 'id' | 'title' | 'content'>; number?: number; preview?: boolean }) {
    return <article className="rule-article" id={preview ? undefined : `rule-${rule.id}`}>
        <div className="rule-article-heading">
            {number !== undefined && <span className="rule-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>}
            <h2 tabIndex={-1}>{rule.title}</h2>
        </div>
        <div className="rule-prose">{rule.content.replace(/\r\n/g, '\n').split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
            const clause = paragraph.match(/^(\d+\.\d+\. [^\n]+)\n([\s\S]+)$/);
            return clause ? <section className="rule-clause" key={index}><h3>{clause[1]}</h3><p>{clause[2]}</p></section> : <p key={index}>{paragraph}</p>;
        })}</div>
    </article>;
}
