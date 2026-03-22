export default function WorkflowVisualizer({ workflow }) {
  if (!workflow) return null;

  const triggerColors = {
    inventory_update: ["#E1F5EE","#0F6E56"],
    cron_21_00:       ["#E6F1FB","#185FA5"],
    cron_09_00:       ["#E6F1FB","#185FA5"],
    scheduled_check:  ["#FAEEDA","#854F0B"],
    sales_update:     ["#EEEDFE","#534AB7"],
    order_created:    ["#FCEBEB","#A32D2D"],
  };
  const [trigBg, trigColor] = triggerColors[workflow.trigger] || ["var(--surface2)","var(--text2)"];

  const box = (label, sublabel, bg, color, border) => (
    <div style={{
      background: bg, border: `0.5px solid ${border}`,
      borderRadius:10, padding:"10px 16px", textAlign:"center", minWidth:120
    }}>
      <div style={{ fontSize:12, fontWeight:500, color }}>{label}</div>
      {sublabel && <div style={{ fontSize:10, color, opacity:0.8, marginTop:2 }}>{sublabel}</div>}
    </div>
  );

  const arrow = () => (
    <div style={{ display:"flex", alignItems:"center", color:"var(--text3)", fontSize:16, padding:"0 4px" }}>→</div>
  );

  return (
    <div style={{
      background:"var(--surface2)", borderRadius:10,
      padding:"16px 20px", marginTop:12
    }}>
      <div style={{ fontSize:11, color:"var(--text3)", textTransform:"uppercase", letterSpacing:".04em", fontWeight:500, marginBottom:12 }}>
        Workflow flow
      </div>
      <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4 }}>

        {/* Trigger */}
        {box("Trigger", workflow.trigger, trigBg, trigColor, trigColor)}
        {arrow()}

        {/* Condition */}
        {workflow.condition ? (
          <>
            {box(
              "Condition",
              `${workflow.condition.field} ${workflow.condition.op} ${workflow.condition.value}`,
              "var(--warning-light)", "var(--warning)", "#EF9F27"
            )}
            {arrow()}
          </>
        ) : null}

        {/* Actions */}
        {workflow.actions.map((action, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
            {box(action.replace(/_/g, " "), null, "var(--accent-light)", "var(--accent-dark)", "#1D9E75")}
            {i < workflow.actions.length - 1 && arrow()}
          </div>
        ))}

        {arrow()}

        {/* Notification end */}
        {box("Done", "logged to DB", "var(--surface)", "var(--text2)", "var(--border2)")}
      </div>
    </div>
  );
}