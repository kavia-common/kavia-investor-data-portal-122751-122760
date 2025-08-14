import React from "react";
import { Button, Card, Typography, Space } from "antd";
import { FileOutlined } from "@ant-design/icons";
import useDocuments from "../hooks/useDocuments";
import { getURL } from "../utils/getURL";

/**
 * Home (Landing) Page
 *
 * PUBLIC_INTERFACE
 * Displays a visually prominent section featuring all Tier 1 (public) documents fetched from Supabase.
 * Accessible to all users without authentication or access control.
 * Shows filename, description, and enables direct viewing/downloading of documents.
 */
const Home = () => {
  // Fetch only "tier_1" (public) docs—no authentication required
  const { documents, loading, error } = useDocuments({ tier: "tier_1", publicOnly: true });

  return (
    <div className="home-landing" style={{ maxWidth: 900, margin: "0 auto", padding: "2em 0" }}>
      <Typography.Title level={2} style={{ color: "#0057B8" }}>
        Welcome to the KAVIA AI Company Data Room
      </Typography.Title>
      <Typography.Paragraph style={{ fontSize: 18, marginBottom: "2em" }}>
        Explore key public company documents below. These are accessible to all users <b>without login</b> or NDA.
      </Typography.Paragraph>

      <section aria-label="Public Documents" style={{ marginTop: 32 }}>
        <Typography.Title level={4} style={{ marginBottom: 24, color: "#282C34" }}>
          📂 Public Pitch Deck & Company Docs
        </Typography.Title>
        {loading && <Typography.Text>Loading documents…</Typography.Text>}
        {error && (
          <Typography.Text type="danger">
            Error loading documents: {error.message}
          </Typography.Text>
        )}

        {!loading && !error && documents.length === 0 && (
          <Typography.Text>No public documents are currently available.</Typography.Text>
        )}

        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {documents.map((doc) => (
            <Card
              key={doc.id}
              bordered
              style={{ display: "flex", alignItems: "center", background: "#f7fafd", borderLeft: "4px solid #0057B8" }}
              bodyStyle={{ display: "flex", alignItems: "center", padding: 20 }}
              data-testid="public-document-card"
            >
              <FileOutlined style={{ fontSize: 32, color: "#0057B8", marginRight: 20 }} />
              <div style={{ flex: 1 }}>
                <Typography.Text strong style={{ fontSize: 17 }}>
                  {doc.filename}
                </Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 15 }}>
                  {doc.description || "No description provided."}
                </Typography.Text>
              </div>
              {/* "View" or "Download" depending on doc type; always open in new tab */}
              <Button
                type="primary"
                href={getURL(doc.file_url)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: 24, background: "#0057B8", borderColor: "#0057B8" }}
              >
                {doc.filename && doc.filename.match(/\.(pdf|docx?|pptx?)$/i) ? "View" : "Download"}
              </Button>
            </Card>
          ))}
        </Space>
      </section>
    </div>
  );
};

export default Home;
