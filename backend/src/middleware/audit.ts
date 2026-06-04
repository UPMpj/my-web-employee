import { pool } from "../db";

export const audit =
  (action: string, entity: string) =>
  async (req: any, res: any, next: any) => {
    const oldJson = res.json;

    res.json = async function (data: any) {
      try {
        const company_id =
          req.body.company_id ||
          req.params.companyId ||
          req.query.companyId ||
          null;

        await pool.query(
          `
          INSERT INTO audit_log
          (company_id,user_id,action,entity_type,entity_id,after_data)
          VALUES($1,$2,$3,$4,$5,$6)
          `,
          [
            company_id,
            req.user?.user_id,
            action,
            entity,
            data?.id || null,
            JSON.stringify(data),
          ]
        );
      } catch (err) {
        console.error("AUDIT ERROR", err);
      }

      oldJson.call(this, data);
    };

    next();
  };