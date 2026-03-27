import { format } from "date-fns";
import { Document, Packer, Paragraph, TextRun } from "docx";

export type ExportTask = {
  id: string;
  title: string;
  description: string | null;
  taskDate: Date;
};

export async function buildTaskReportDocx(input: {
  from: Date;
  to: Date;
  tasks: ExportTask[];
}) {
  const grouped = new Map<string, ExportTask[]>();

  for (const task of input.tasks) {
    const key = format(task.taskDate, "yyyy-MM-dd");
    const items = grouped.get(key) ?? [];
    items.push(task);
    grouped.set(key, items);
  }

  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Tasks done ${format(input.from, "dd.MM.yyyy")} - ${format(input.to, "dd.MM.yyyy")}`,
          bold: true,
          size: 40,
          font: "Calibri"
        })
      ]
    })
  );

  for (const [dayKey, dayTasks] of grouped) {
    const dayDate = new Date(`${dayKey}T00:00:00`);

    children.push(
      new Paragraph({
        spacing: { before: 360, after: 220 },
        children: [
          new TextRun({
            text: `${format(dayDate, "dd.MM.yyyy EEEE")}`,
            bold: true,
            size: 28,
            font: "Calibri"
          })
        ]
      })
    );

    for (const task of dayTasks) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: `${task.title}:`,
              bold: true,
              size: 24,
              font: "Calibri"
            })
          ]
        })
      );

      const lines = (task.description ?? "").split("\n");
      const textRuns: TextRun[] = [];

      lines.forEach((line, index) => {
        textRuns.push(
          new TextRun({
            text: line,
            italics: true,
            size: 21,
            break: index === 0 ? 0 : 1,
            font: "Calibri"
          })
        );
      });

      if (textRuns.length === 0) {
        textRuns.push(
          new TextRun({
            text: "",
            size: 21,
            italics: true,
            font: "Calibri"
          })
        );
      }

      children.push(
        new Paragraph({
          spacing: { after: 180 },
          children: textRuns
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return Packer.toBuffer(doc);
}
