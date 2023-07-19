"use strict";

const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const Company = require("./company");

/** Related functions for jobs */

class Job {

  /** Create a job (from data), update db, return new job data
   * @param {title, salary, equity, company_handle}
   * If companyHandle does not exist, throws NotFoundError
   *
   * Returns {id, title, salary, equity, company_handle}
   */
  static async create({ title, salary, equity, companyHandle }) {
    const companyPreCheck = await db.query(`
                SELECT handle
                FROM companies
                WHERE handle = $1`, [companyHandle]);
    const company = companyPreCheck.rows[0];

    if (!company) throw new NotFoundError(`No company: ${companyHandle}`);

    const result = await db.query(`
        INSERT INTO jobs(title,
                         salary,
                         equity,
                         company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"`, [
        title,
        salary,
        equity,
        companyHandle
      ],
    );

    const job = result.rows[0];

    return job;
  }

  /** Find all jobs
   *
   * Return [{id, title, salary, equity, company_handle}, ...]
   */
  static async findAll() {
    console.log("in Jobs findAll");

    const response = await db.query(`
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        ORDER BY company_handle, title`
    );

    return response.rows;
  }

  /** Find matching jobs based on filter
   *
   * @param {Object} filterBy {title, minSalary, hasEquity}
   * filterBy potential props (all optional):
   * - minSalary
   * - hasEquity (true returns only jobs with equity > 0, other values ignored)
   * - title (will find case-insensitive, partial matches)
   *
   * Returns [{id, title, salary, equity, company_handle}, ...]
  */

  static async findSome(filterBy) {
    const { where, values } = this._createSqlFilter(filterBy);

    const filteredJobsRes = await db.query(`
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        WHERE ${where}
        ORDER BY company_handle, title`, values
    );

    return filteredJobsRes.rows;
  }

  /**
  * Private Method for building SQL where clause and values for findSome
  * @param {Object} filterBy
  * Not all filters required
  * example: {titleLike: "net", minSalary: 200, hasEquity: true}
  *
  * Returns {
  *          where: `title ILIKE $1 AND salary >= $2 AND equity > 0`,
  *          values: ["net", 200]
  * }
  */

  static _createSqlFilter(filterBy) {
    const criterias = [];
    const values = [];

    if (filterBy.titleLike !== undefined) {
      values.push(`%${filterBy.titleLike}%`);
      criterias.push(`title ILIKE $${values.length}`);
    }

    if (filterBy.minSalary !== undefined) {
      values.push(filterBy.minSalary);
      criterias.push(`salary >= $${values.length}`);
    }

    if (filterBy.hasEquity === true) {
      criterias.push(`equity > 0`);
    }

    const where = criterias.join(" AND ");

    return { where, values };
  }

  /** Given a job id, return data about job
   *
   * @param jobId number
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found
  */
  static async get(jobId) {
    const jobRes = await db.query(`
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`, [jobId]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${jobId}`);

    return job;
  }

  /** Update job with `data`
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * @param {Object} data: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found
  */

  static async update(jobId, data) {
    // TODO: Find way to ensure only title, salary, equity included in data but also pass along empty obj if empty?
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE jobs
        SET ${setCols}
        WHERE id = ${idVarIdx}
        RETURNING
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"`;

    const result = await db.query(querySql, [...values, jobId]);

    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${jobId}`);

    return job;
  }

  /** Delete a given job from database; returns undefined
   *
   * Throws NotFoundError if job not found
   */
  static async remove(jobId) {
    const result = await db.query(`
        DELETE
        FROM jobs
        WHERE id = $1
        RETURNING id`, [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}

module.exports = Job;