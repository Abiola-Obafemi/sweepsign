import Link from "next/link";
import { BrandHeader, DocumentFooter } from "./PublicDocument";

export function LandingPage() {
  return (
    <>
      <BrandHeader />
      <main className="landing" id="main-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy landing-reveal">
            <p className="landing-kicker">
              For residential cleaning professionals
            </p>
            <h1 id="landing-title">
              Clean homes.
              <br />
              Leave a clear
              <br />
              finish.
            </h1>
            <p className="landing-lede">
              Turn the last few minutes of a cleaning job into one
              customer-ready handoff: what was completed, any exception, and one
              useful next step.
            </p>
            <div className="landing-actions">
              <Link className="primary-button" href="/signup">
                Create your first handoff
              </Link>
              <a className="text-link" href="#how-it-works">
                See the workflow
              </a>
            </div>
          </div>

          <div
            className="landing-demo"
            aria-label="Illustrative SweepSign handoff flow"
          >
            <p className="demo-label">Illustrative handoff</p>
            <section className="demo-stage demo-stage--scope">
              <div className="demo-stage-heading">
                <span>1</span>
                <strong>Scope</strong>
                <small>Set before you leave</small>
              </div>
              <div className="demo-checklist">
                <span>
                  <i aria-hidden="true">✓</i> Kitchen surfaces
                </span>
                <span>
                  <i aria-hidden="true">✓</i> Bathroom reset
                </span>
                <span>
                  <i aria-hidden="true">✓</i> Floors
                </span>
              </div>
            </section>
            <section className="demo-stage demo-stage--proof">
              <div className="demo-stage-heading">
                <span>2</span>
                <strong>Proof</strong>
                <small>Only when it helps</small>
              </div>
              <div className="demo-proof-frame" aria-hidden="true">
                <div />
                <div />
                <div />
              </div>
            </section>
            <article className="landing-sheet">
              <div className="receipt-topline">
                <span>3</span>
                <strong>Handoff</strong>
                <small>Ready to send</small>
              </div>
              <span className="landing-example-note">
                Illustrative example · home service
              </span>
              <h2>A clear record of today’s work.</h2>
              <section>
                <strong>Completed today</strong>
                <p>Kitchen surfaces · Bathroom reset · Floors</p>
              </section>
              <footer>
                <span>One clear next step</span>
                <span className="landing-example-action">Your link</span>
              </footer>
            </article>
          </div>
        </section>

        <section
          className="landing-story landing-section"
          aria-labelledby="problem-title"
        >
          <div>
            <p className="context-line">The end-of-job gap</p>
            <h2 id="problem-title">
              A good clean can still end in a scattered text thread.
            </h2>
          </div>
          <p>
            Photos, notes, a payment link, and a rebooking request often get
            sent separately, if they get sent at all. SweepSign gives the
            customer one read-only handoff they can understand without asking
            what happened.
          </p>
        </section>

        <section
          id="how-it-works"
          className="landing-process landing-section"
          aria-labelledby="workflow-title"
        >
          <h2 className="visually-hidden" id="workflow-title">
            How SweepSign works
          </h2>
          <div>
            <span>Scope</span>
            <h3>Mark the work</h3>
            <p>
              Use a short checklist to show what was completed, not completed,
              or not needed.
            </p>
          </div>
          <div>
            <span>Proof</span>
            <h3>Add context</h3>
            <p>
              Keep an exception note and a few client-approved photos when they
              make the result clearer.
            </p>
          </div>
          <div>
            <span>Handoff</span>
            <h3>Choose one next step</h3>
            <p>
              Share a payment, review, or rebooking link you already use. The
              customer sees one focused record.
            </p>
          </div>
        </section>

        <section
          className="landing-result landing-section"
          aria-labelledby="result-title"
        >
          <div>
            <p className="context-line">What the customer receives</p>
            <h2 id="result-title">
              A plain, read-only summary that respects the work.
            </h2>
            <p className="landing-section-copy">
              You can revoke the shared link when it no longer needs to be
              available.
            </p>
          </div>
          <div
            className="result-slip"
            aria-label="Illustrative customer handoff"
          >
            <span>Today’s handoff</span>
            <dl>
              <div>
                <dt>Scope</dt>
                <dd>Completed items, clearly marked</dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>One plain exception and optional proof</dd>
              </div>
              <div>
                <dt>Next</dt>
                <dd>One payment, review, or rebooking link</dd>
              </div>
            </dl>
          </div>
        </section>

        <section
          className="landing-boundary landing-section"
          aria-labelledby="limits-title"
        >
          <div>
            <p className="context-line">A clear boundary</p>
            <h2 id="limits-title">
              Built for the handoff, not the whole business.
            </h2>
          </div>
          <p className="landing-section-copy">
            SweepSign does not process payments, replace invoicing, schedule
            jobs, manage a team, or verify that work occurred. It helps you
            present the end of one cleaning job clearly.
          </p>
        </section>

        <section
          className="landing-faq landing-section"
          aria-labelledby="faq-title"
        >
          <div>
            <p className="context-line">Questions, answered plainly</p>
            <h2 id="faq-title">Before you start</h2>
          </div>
          <div className="faq-list">
            <details>
              <summary>Do I need a street address to create a job?</summary>
              <p>
                No. Start from a cleaning template and name the job in the way
                that works for you.
              </p>
            </details>
            <details>
              <summary>Can I add photos?</summary>
              <p>
                Yes. Add a few client-approved photos when they help explain the
                completed work or an exception.
              </p>
            </details>
            <details>
              <summary>Can I remove a customer handoff later?</summary>
              <p>
                Yes. A signed-in owner can revoke a shared handoff link from the
                saved job.
              </p>
            </details>
            <details>
              <summary>Does SweepSign collect payment?</summary>
              <p>
                No. You choose one link for payment, a review, or rebooking.
                SweepSign does not process the transaction.
              </p>
            </details>
          </div>
        </section>

        <section
          className="landing-close landing-section"
          aria-labelledby="close-title"
        >
          <h2 id="close-title">Finish the clean. Send one clear handoff.</h2>
          <p>
            Start with a real job and keep the customer’s next step easy to
            find.
          </p>
          <Link className="primary-button" href="/signup">
            Create your first handoff
          </Link>
        </section>
      </main>
      <DocumentFooter />
    </>
  );
}
